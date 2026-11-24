/**
 * The logging the app needs. `console` satisfies it; tests pass a recording or
 * silent logger. A structured logger (e.g. pino) can replace it later without
 * touching callers.
 */
export type Logger = Pick<Console, 'info' | 'warn' | 'error'>;
