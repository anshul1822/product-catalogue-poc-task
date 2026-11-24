import type { ErrorRequestHandler, RequestHandler } from 'express';
import { UpstreamError } from '../domain/errors.js';
import type { Logger } from '../logger.js';

/** The one error shape every endpoint returns. */
export interface ErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

/**
 * An error the client should see, with its HTTP status: validation failures (400),
 * unknown ids (404) and so on. Route handlers throw it; `errorHandler` renders it.
 */
export class ApiError extends Error {
  override readonly name = 'ApiError';

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function errorBody(code: string, message: string, details?: unknown): ErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

/** Requests that match no route. Registered after every router. */
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(errorBody('NOT_FOUND', 'Route not found'));
};

/**
 * Turns any thrown or rejected error into the shared error shape. Internals
 * (stack traces, upstream messages) are logged on the server and never sent.
 */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (error instanceof ApiError) {
      res.status(error.status).json(errorBody(error.code, error.message, error.details));
      return;
    }

    if (error instanceof UpstreamError) {
      logger.warn(`${req.method} ${req.path} failed upstream: ${error.message}`);
      res
        .status(502)
        .json(errorBody('UPSTREAM_UNAVAILABLE', 'A service this request depends on is unavailable. Please try again.'));
      return;
    }

    const clientStatus = clientErrorStatus(error);
    if (clientStatus !== null) {
      res.status(clientStatus).json(clientErrorBody(error, clientStatus));
      return;
    }

    logger.error(`${req.method} ${req.path} failed:`, error);
    res.status(500).json(errorBody('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
  };
}

/**
 * Errors from Express middleware (e.g. the JSON body parser) carry a 4xx `status`
 * and `expose: true` when they are safe to report to the client.
 */
function clientErrorStatus(error: unknown): number | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500 &&
    'expose' in error &&
    error.expose === true
  ) {
    return error.status;
  }
  return null;
}

function clientErrorBody(error: unknown, status: number): ErrorBody {
  const type = typeof error === 'object' && error !== null && 'type' in error ? error.type : undefined;
  if (type === 'entity.parse.failed') {
    return errorBody('INVALID_JSON', 'The request body is not valid JSON.');
  }
  if (status === 413) {
    return errorBody('PAYLOAD_TOO_LARGE', 'The request body is too large.');
  }
  return errorBody('BAD_REQUEST', 'The request could not be processed.');
}
