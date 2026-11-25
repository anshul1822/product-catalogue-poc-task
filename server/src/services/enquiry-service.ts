import { buildEnquiryEmail } from '../domain/enquiry-email.js';
import { type EnquiryFieldErrors, parseEnquiry } from '../domain/enquiry.js';
import { UpstreamError } from '../domain/errors.js';
import type { Logger } from '../logger.js';
import type { EmailSender } from '../ports/email-sender.js';
import type { EnquiryRepository } from '../ports/enquiry-repository.js';
import type { ProductSource } from '../ports/product-source.js';

export interface EnquiryServiceDependencies {
  readonly products: ProductSource;
  readonly repository: EnquiryRepository;
  readonly email: EmailSender;
  readonly logger: Logger;
  readonly settings: {
    readonly salesInbox: string;
    readonly from: string;
    readonly appUrl: string;
  };
  readonly now?: () => Date;
}

export type EnquiryOutcome =
  /** Saved and emailed to the sales inbox. */
  | { readonly outcome: 'sent'; readonly enquiryId: string }
  /** The honeypot was filled: answered like a success, but nothing saved or sent. */
  | { readonly outcome: 'ignored' }
  | { readonly outcome: 'invalid'; readonly errors: EnquiryFieldErrors }
  | { readonly outcome: 'product-not-found' };

/**
 * F5: a customer's enquiry about a product. Depends only on ports, so the email
 * provider and the store can change without touching this flow.
 */
export class EnquiryService {
  private readonly deps: EnquiryServiceDependencies;
  private readonly now: () => Date;

  constructor(deps: EnquiryServiceDependencies) {
    this.deps = deps;
    this.now = deps.now ?? (() => new Date());
  }

  /**
   * 1. Validate the body; invalid -> field errors, nothing saved or sent.
   * 2. Honeypot filled -> "ignored", nothing saved or sent.
   * 3. Look up the product on the server (the client's title or price is never
   *    trusted); unknown -> "product-not-found".
   * 4. Save the enquiry as PENDING, with a snapshot of the product. If the store
   *    fails, `UpstreamError` propagates and no email is sent, so every email has a record.
   * 5. Send the email to the sales inbox.
   *    - Sent -> mark SENT. If only that update fails, the email is already out, so the
   *      customer still gets "sent" (asking them to retry would send a duplicate).
   *    - Failed -> mark FAILED with the reason, then rethrow (502): the customer sees an
   *      error and can retry, and sales can still find the lead.
   *
   * Logs carry the enquiry id and status only, never the customer's details.
   */
  async submit(body: unknown): Promise<EnquiryOutcome> {
    const parsed = parseEnquiry(body);
    if (!parsed.ok) {
      return { outcome: 'invalid', errors: parsed.errors };
    }
    if (parsed.honeypotFilled) {
      this.deps.logger.info('Enquiry ignored: honeypot field filled');
      return { outcome: 'ignored' };
    }

    const { input } = parsed;
    const product = await this.deps.products.getById(input.productId);
    if (product === null) {
      return { outcome: 'product-not-found' };
    }

    const stored = await this.deps.repository.create({
      productId: product.id,
      productTitle: product.title,
      productPrice: product.price,
      customerName: input.name,
      customerEmail: input.email,
      customerPhone: input.phone,
      message: input.message,
    });

    const email = buildEnquiryEmail({
      enquiryId: stored.id,
      enquiry: input,
      product,
      receivedAt: stored.createdAt,
      to: this.deps.settings.salesInbox,
      from: this.deps.settings.from,
      appUrl: this.deps.settings.appUrl,
    });

    try {
      await this.deps.email.send(email);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      await this.deps.repository.markFailed(stored.id, reason).catch((markError: unknown) => {
        this.deps.logger.error(`Enquiry ${stored.id}: could not record the email failure:`, markError);
      });
      this.deps.logger.warn(`Enquiry ${stored.id} saved as FAILED: ${reason}`);
      throw error instanceof UpstreamError ? error : new UpstreamError('email', reason, { cause: error });
    }

    try {
      await this.deps.repository.markSent(stored.id, this.now());
    } catch (error) {
      this.deps.logger.error(`Enquiry ${stored.id} was emailed but could not be marked SENT:`, error);
    }
    this.deps.logger.info(`Enquiry ${stored.id} sent`);
    return { outcome: 'sent', enquiryId: stored.id };
  }
}
