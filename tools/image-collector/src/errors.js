const DEFAULT_STATUS = {
  INVALID_URL: 400,
  UNSUPPORTED_PROTOCOL: 400,
  BLOCKED_HOST: 400,
  VALIDATION_ERROR: 400,
  UNSUPPORTED_PLATFORM: 422,
  UNSUPPORTED_URL: 422,
  UNSUPPORTED_FORMAT: 415,
  INVALID_IMAGE: 422,
  FETCH_FAILED: 502,
  HTTP_ERROR: 502,
  RATE_LIMITED: 429,
  DOWNLOAD_TOO_LARGE: 413,
  PAYLOAD_TOO_LARGE: 413,
  DUPLICATE_IMAGE: 409,
  PREVIEW_NOT_FOUND: 404,
  PREVIEW_EXPIRED: 410,
  CONFIRM_CONFLICT: 409,
  CATALOG_WRITE_FAILED: 500,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  constructor(code, message, { status, details, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.status = status ?? DEFAULT_STATUS[code] ?? 500;
    this.details = details;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details === undefined ? {} : { details: this.details }),
    };
  }
}

export function asAppError(error, fallbackCode = 'INTERNAL_ERROR') {
  if (error instanceof AppError) {
    return error;
  }
  return new AppError(fallbackCode, 'Unexpected internal error.', { cause: error });
}
