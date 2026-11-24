import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getProduct } from '../api/catalogue';
import { ApiError } from '../api/client';
import {
  ENQUIRY_LIMITS,
  type EnquiryField,
  type EnquiryFieldErrors,
  fieldErrorsOf,
  sendEnquiry,
  validateEnquiry,
} from '../api/enquiries';
import type { Product } from '../api/types';
import { useApiData } from '../api/useApiData';
import { Price } from '../components/Price';
import { ErrorState, LoadingState } from '../components/StatusMessages';
import styles from './EnquirePage.module.css';

/**
 * F5: the enquiry form, at /products/:id/enquire (opened from the product page's
 * Enquire button). The product is loaded again here, so the page works from a
 * direct link and the form can say which product it is about.
 */
export function EnquirePage() {
  const id = useParams().id ?? '';
  const product = useApiData(`product/${id}`, (signal) => getProduct(id, signal));

  if (product.status === 'loading') {
    return <LoadingState label="Loading product…" />;
  }
  if (product.status === 'error') {
    return product.error.status === 404 ? (
      <section aria-labelledby="enquire-not-found-heading">
        <h1 id="enquire-not-found-heading">Product not found</h1>
        <p>
          This product does not exist or is no longer available. <Link to="/">Go to the home page</Link>.
        </p>
      </section>
    ) : (
      <ErrorState message={product.error.message} onRetry={product.retry} />
    );
  }
  return <EnquiryForm product={product.data} />;
}

type Values = Record<EnquiryField, string>;
type Status =
  | { readonly kind: 'editing' }
  | { readonly kind: 'sending' }
  | { readonly kind: 'sent' }
  | { readonly kind: 'failed'; readonly message: string };

const EMPTY: Values = { name: '', email: '', phone: '', message: '' };

const FIELD_ORDER: readonly EnquiryField[] = ['name', 'email', 'phone', 'message'];

function EnquiryForm({ product }: { product: Product }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<EnquiryFieldErrors>({});
  const [status, setStatus] = useState<Status>({ kind: 'editing' });
  const honeypotRef = useRef<HTMLInputElement>(null);
  const fieldRefs = useRef<Partial<Record<EnquiryField, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const thankYouRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (status.kind === 'sent') {
      thankYouRef.current?.focus();
    }
  }, [status.kind]);

  const productLink = `/products/${encodeURIComponent(product.id)}`;

  if (status.kind === 'sent') {
    return (
      <section aria-labelledby="thank-you-heading" className={styles.thankYou}>
        <h1 id="thank-you-heading" ref={thankYouRef} tabIndex={-1}>
          Thank you
        </h1>
        <p role="status">
          Your enquiry about <strong>{product.title}</strong> has been sent. Our sales team will reply to{' '}
          <strong>{values.email.trim()}</strong>.
        </p>
        <p>
          <Link to={productLink}>Back to the product</Link> · <Link to="/">Go to the home page</Link>
        </p>
      </section>
    );
  }

  const onChange = (field: EnquiryField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field] !== undefined) {
      setErrors(({ [field]: _removed, ...rest }) => rest);
    }
  };

  const focusFirstError = (fieldErrors: EnquiryFieldErrors) => {
    const first = FIELD_ORDER.find((field) => fieldErrors[field] !== undefined);
    if (first !== undefined) {
      fieldRefs.current[first]?.focus();
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status.kind === 'sending') {
      return;
    }

    const clientErrors = validateEnquiry(values);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setStatus({ kind: 'editing' });
      focusFirstError(clientErrors);
      return;
    }

    setErrors({});
    setStatus({ kind: 'sending' });
    try {
      await sendEnquiry({
        productId: product.id,
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        message: values.message.trim(),
        website: honeypotRef.current?.value ?? '',
      });
      setStatus({ kind: 'sent' });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, 'UNEXPECTED_ERROR', 'Something went wrong. Please try again.');
      const serverErrors = fieldErrorsOf(apiError);
      if (Object.keys(serverErrors).length > 0) {
        setErrors(serverErrors);
        setStatus({ kind: 'editing' });
        focusFirstError(serverErrors);
        return;
      }
      // Everything the customer typed stays in the form, so they can try again.
      setStatus({ kind: 'failed', message: messageFor(apiError) });
    }
  };

  const sending = status.kind === 'sending';

  return (
    <section aria-labelledby="enquire-heading" className={styles.page}>
      <h1 id="enquire-heading">Enquire about this product</h1>
      <p className={styles.product}>
        <Link to={productLink}>{product.title}</Link> · <Price amount={product.price} />
      </p>

      {status.kind === 'failed' ? <ErrorState message={status.message} /> : null}

      <form className={styles.form} onSubmit={onSubmit} noValidate aria-busy={sending}>
        <TextField
          field="name"
          label="Your name"
          autoComplete="name"
          maxLength={ENQUIRY_LIMITS.name}
          required
          value={values.name}
          error={errors.name}
          onChange={onChange('name')}
          inputRef={(element) => {
            fieldRefs.current.name = element;
          }}
        />
        <TextField
          field="email"
          label="Email address"
          type="email"
          autoComplete="email"
          maxLength={ENQUIRY_LIMITS.email}
          required
          value={values.email}
          error={errors.email}
          onChange={onChange('email')}
          inputRef={(element) => {
            fieldRefs.current.email = element;
          }}
        />
        <TextField
          field="phone"
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          maxLength={ENQUIRY_LIMITS.phone}
          value={values.phone}
          error={errors.phone}
          onChange={onChange('phone')}
          inputRef={(element) => {
            fieldRefs.current.phone = element;
          }}
        />

        <div className={styles.field}>
          <label htmlFor="enquiry-message">Message (optional)</label>
          <textarea
            id="enquiry-message"
            name="message"
            rows={5}
            maxLength={ENQUIRY_LIMITS.message}
            value={values.message}
            onChange={onChange('message')}
            aria-invalid={errors.message !== undefined}
            aria-describedby={errors.message === undefined ? undefined : 'enquiry-message-error'}
            ref={(element) => {
              fieldRefs.current.message = element;
            }}
            className={styles.input}
          />
          {errors.message === undefined ? null : (
            <p id="enquiry-message-error" className={styles.error}>
              {errors.message}
            </p>
          )}
        </div>

        {/* Honeypot: hidden from people and screen readers; only bots fill it. */}
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor="enquiry-website">Website</label>
          <input id="enquiry-website" name="website" type="text" tabIndex={-1} autoComplete="off" ref={honeypotRef} />
        </div>

        <button type="submit" className={styles.submit} disabled={sending}>
          {sending ? 'Sending…' : 'Send enquiry'}
        </button>
        {sending ? (
          <p role="status" className="visually-hidden">
            Sending your enquiry…
          </p>
        ) : null}
      </form>
    </section>
  );
}

interface TextFieldProps {
  readonly field: Exclude<EnquiryField, 'message'>;
  readonly label: string;
  readonly type?: 'text' | 'email' | 'tel';
  readonly autoComplete: string;
  readonly maxLength: number;
  readonly required?: boolean;
  readonly value: string;
  readonly error: string | undefined;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly inputRef: (element: HTMLInputElement | null) => void;
}

function TextField({ field, label, type = 'text', autoComplete, maxLength, required = false, value, error, onChange, inputRef }: TextFieldProps) {
  const id = `enquiry-${field}`;
  const errorId = `${id}-error`;
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={field}
        type={type}
        autoComplete={autoComplete}
        maxLength={maxLength}
        required={required}
        aria-required={required}
        value={value}
        onChange={onChange}
        aria-invalid={error !== undefined}
        aria-describedby={error === undefined ? undefined : errorId}
        ref={inputRef}
        className={styles.input}
      />
      {error === undefined ? null : (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

function messageFor(error: ApiError): string {
  if (error.status === 404) {
    return 'This product is no longer available, so the enquiry could not be sent.';
  }
  if (error.status === 429 || error.status === 0) {
    return error.message;
  }
  return 'Your enquiry could not be sent. Please try again. What you typed is still here.';
}
