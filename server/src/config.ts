import { z } from 'zod';
import { parseFeaturedIds } from './adapters/featured-config/config-featured-products.js';
import { ConfigError } from './domain/errors.js';

/** Validated configuration. Built once at startup by `loadConfig`; nothing else reads `process.env`. */
export interface AppConfig {
  readonly port: number;
  readonly fakeStore: {
    readonly baseUrl: string;
    readonly timeoutMs: number;
  };
  /** The 5 "top rated" product ids, in display order. */
  readonly featuredProductIds: readonly string[];
}

/**
 * Safe local defaults, so the server starts without a `.env` file.
 * `.env.example` lists the same values; a test keeps the two in step.
 */
export const CONFIG_DEFAULTS = {
  PORT: '3000',
  FAKESTORE_BASE_URL: 'https://fakestoreapi.com',
  UPSTREAM_TIMEOUT_MS: '5000',
  FEATURED_PRODUCT_IDS: '12,11,3,18,5',
} as const;

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535),
  FAKESTORE_BASE_URL: z.url({ protocol: /^https?$/, message: 'must be an http(s) URL' }),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000),
  FEATURED_PRODUCT_IDS: z.string(),
});

/**
 * Reads and validates the environment. Every problem is reported in one
 * `ConfigError`, so a bad deployment fails at startup with a full list instead
 * of failing on the first request.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const raw = {
    PORT: env['PORT'] ?? CONFIG_DEFAULTS.PORT,
    FAKESTORE_BASE_URL: env['FAKESTORE_BASE_URL'] ?? CONFIG_DEFAULTS.FAKESTORE_BASE_URL,
    UPSTREAM_TIMEOUT_MS: env['UPSTREAM_TIMEOUT_MS'] ?? CONFIG_DEFAULTS.UPSTREAM_TIMEOUT_MS,
    FEATURED_PRODUCT_IDS: env['FEATURED_PRODUCT_IDS'] ?? CONFIG_DEFAULTS.FEATURED_PRODUCT_IDS,
  };

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

  if (!parsed.success || problems.length > 0) {
    throw new ConfigError(`Invalid configuration:\n- ${problems.join('\n- ')}`);
  }

  return {
    port: parsed.data.PORT,
    fakeStore: {
      baseUrl: parsed.data.FAKESTORE_BASE_URL,
      timeoutMs: parsed.data.UPSTREAM_TIMEOUT_MS,
    },
    featuredProductIds,
  };
}
