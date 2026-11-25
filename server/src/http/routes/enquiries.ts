import { type RequestHandler, Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { EnquiryService } from '../../services/enquiry-service.js';
import { ApiError, errorBody } from '../errors.js';

export interface EnquiryRateLimit {
  readonly windowMs: number;
  /** Enquiries one client may send per window. */
  readonly limit: number;
}

/** Generous for a person, low enough to slow a script down. */
export const DEFAULT_ENQUIRY_RATE_LIMIT: EnquiryRateLimit = { windowMs: 15 * 60 * 1000, limit: 10 };

/**
 * F5. `POST /api/enquiries` with `{ productId, name, email, phone?, message?, website? }`.
 * - 201 `{ status: "received" }`: saved and emailed (also for a filled honeypot, so a
 *   bot cannot tell it was ignored);
 * - 400 `VALIDATION_FAILED` with `details.fields` (one message per field);
 * - 404 `PRODUCT_NOT_FOUND`;
 * - 429 `TOO_MANY_REQUESTS` after `limit` enquiries from one client in the window;
 * - 502 when the store or the email provider fails (through `errorHandler`).
 */
export function enquiryRoutes(enquiries: EnquiryService, limits: EnquiryRateLimit = DEFAULT_ENQUIRY_RATE_LIMIT): Router {
  const router = Router();
  router.post('/enquiries', enquiryRateLimiter(limits), async (req, res) => {
    const result = await enquiries.submit(req.body);
    switch (result.outcome) {
      case 'sent':
      case 'ignored':
        res.status(201).json({ status: 'received' });
        return;
      case 'invalid':
        throw new ApiError(400, 'VALIDATION_FAILED', 'Check the highlighted fields.', { fields: result.errors });
      case 'product-not-found':
        throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    }
  });
  return router;
}

function enquiryRateLimiter({ windowMs, limit }: EnquiryRateLimit): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res
        .status(429)
        .json(errorBody('TOO_MANY_REQUESTS', 'You have sent a lot of enquiries. Please wait a few minutes and try again.'));
    },
  });
}
