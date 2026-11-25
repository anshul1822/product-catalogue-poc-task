import { z } from 'zod';
import { parseFeaturedIds } from './adapters/featured-config/config-featured-products.js';
import { ConfigError } from './domain/errors.js';

export type EnquiryStoreConfig =
  | { readonly kind: 'memory' }
  | { readonly kind: 'postgres'; readonly databaseUrl: string };

export type EmailConfig =
  | { readonly provider: 'console' }
  | {
      readonly provider: 'smtp';
      readonly host: string;
      readonly port: number;
      readonly secure: boolean;
      readonly user: string | null;
      readonly pass: string | null;
    };

/** Validated configuration. Built once at startup by `loadConfig`; nothing else reads `process.env`. */
export interface AppConfig {
  readonly port: number;
  readonly fakeStore: {
    readonly baseUrl: string;
    readonly timeoutMs: number;
  };
  /** The 5 "top rated" product ids, in display order. */
  readonly featuredProductIds: readonly string[];
  readonly enquiryStore: EnquiryStoreConfig;
  readonly email: EmailConfig;
  readonly enquiryEmail: {
    readonly from: string;
    /** The sales inbox every enquiry goes to. */
    readonly to: string;
  };
  /** Base URL of the web app, for links in emails. */
  readonly publicAppUrl: string;
}

/**
 * Safe local defaults, so the server starts without a `.env` file and without
 * Docker: enquiries in memory, emails printed to the console. Docker Compose
 * sets PostgreSQL and Mailpit explicitly. `.env.example` lists the same values;
 * a test keeps the two in step.
 */
export const CONFIG_DEFAULTS = {
  PORT: '3000',
  FAKESTORE_BASE_URL: 'https://fakestoreapi.com',
  UPSTREAM_TIMEOUT_MS: '5000',
  FEATURED_PRODUCT_IDS: '12,11,3,18,5',
  ENQUIRY_STORE: 'memory',
  DATABASE_URL: '',
  EMAIL_PROVIDER: 'console',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  SMTP_SECURE: 'false',
  SMTP_USER: '',
  SMTP_PASS: '',
  EMAIL_FROM: 'no-reply@catalogue.local',
  SALES_INBOX_EMAIL: 'sales@catalogue.local',
  PUBLIC_APP_URL: 'http://localhost:8080',
} as const;

type ConfigKey = keyof typeof CONFIG_DEFAULTS;

const emailAddress = z.email({ error: 'must be an email address' });

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535),
  FAKESTORE_BASE_URL: z.url({ protocol: /^https?$/, error: 'must be an http(s) URL' }),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000),
  FEATURED_PRODUCT_IDS: z.string(),
  ENQUIRY_STORE: z.enum(['memory', 'postgres'], { error: 'must be "memory" or "postgres"' }),
  DATABASE_URL: z.string(),
  EMAIL_PROVIDER: z.enum(['console', 'smtp'], { error: 'must be "console" or "smtp"' }),
  SMTP_HOST: z.string().min(1, 'must not be empty'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535),
  SMTP_SECURE: z.enum(['true', 'false'], { error: 'must be "true" or "false"' }),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  EMAIL_FROM: emailAddress,
  SALES_INBOX_EMAIL: emailAddress,
  PUBLIC_APP_URL: z.url({ protocol: /^https?$/, error: 'must be an http(s) URL' }),
});

/**
 * Reads and validates the environment. Every problem is reported in one
 * `ConfigError`, so a bad deployment fails at startup with a full list instead
 * of failing on the first request.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const raw = Object.fromEntries(
    (Object.keys(CONFIG_DEFAULTS) as ConfigKey[]).map((key) => [key, env[key] ?? CONFIG_DEFAULTS[key]]),
  ) as Record<ConfigKey, string>;

  const problems: string[] = [];

  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      problems.push(`${issue.path.join('.')}: ${issue.message}`);
    }
  }

  let featuredProductIds: string[] = [];
  try {
    featuredProductIds = parseFeaturedIds(raw.FEATURED_PRODUCT_IDS);
  } catch (error) {
    if (!(error instanceof ConfigError)) {
      throw error;
    }
    problems.push(error.message);
  }

  if (raw.ENQUIRY_STORE === 'postgres' && !/^postgres(ql)?:\/\/.+/.test(raw.DATABASE_URL)) {
    problems.push('DATABASE_URL: must be a postgresql:// URL when ENQUIRY_STORE is "postgres"');
  }

  // The local-only adapters lose enquiries (memory) or log personal data (console).
  if (env['NODE_ENV'] === 'production') {
    if (raw.ENQUIRY_STORE === 'memory') {
      problems.push('ENQUIRY_STORE: "memory" loses enquiries on restart and is not allowed when NODE_ENV is "production"');
    }
    if (raw.EMAIL_PROVIDER === 'console') {
      problems.push('EMAIL_PROVIDER: "console" logs customer details and is not allowed when NODE_ENV is "production"');
    }
  }

  if (!parsed.success || problems.length > 0) {
    throw new ConfigError(`Invalid configuration:\n- ${problems.join('\n- ')}`);
  }

  const values = parsed.data;
  return {
    port: values.PORT,
    fakeStore: {
      baseUrl: values.FAKESTORE_BASE_URL,
      timeoutMs: values.UPSTREAM_TIMEOUT_MS,
    },
    featuredProductIds,
    enquiryStore:
      values.ENQUIRY_STORE === 'postgres' ? { kind: 'postgres', databaseUrl: values.DATABASE_URL } : { kind: 'memory' },
    email:
      values.EMAIL_PROVIDER === 'smtp'
        ? {
            provider: 'smtp',
            host: values.SMTP_HOST,
            port: values.SMTP_PORT,
            secure: values.SMTP_SECURE === 'true',
            user: values.SMTP_USER === '' ? null : values.SMTP_USER,
            pass: values.SMTP_PASS === '' ? null : values.SMTP_PASS,
          }
        : { provider: 'console' },
    enquiryEmail: { from: values.EMAIL_FROM, to: values.SALES_INBOX_EMAIL },
    publicAppUrl: values.PUBLIC_APP_URL,
  };
}
