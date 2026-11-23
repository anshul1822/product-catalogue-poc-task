/**
 * An external system (product source, email provider) failed or returned data
 * we cannot use. The HTTP layer maps this to 502/503. Expected "not found"
 * results are never errors: they are `null` or an empty list.
 */
export class UpstreamError extends Error {
  override readonly name = 'UpstreamError';

  constructor(
    /** Which system failed, e.g. "fakestore". */
    readonly source: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(`[${source}] ${message}`, options);
  }
}

/** Configuration is missing or invalid. Raised at startup so the app fails fast. */
export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}
