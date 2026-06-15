export class BaseError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly status: number = 400,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'NOT_FOUND', 404, details);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Non autorisé', details?: Record<string, any>) {
    super(message, 'UNAUTHORIZED', 401, details);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string = 'Accès interdit', details?: Record<string, any>) {
    super(message, 'FORBIDDEN', 403, details);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class InsufficientStockError extends BaseError {
  constructor(message: string = 'Stock insuffisant', details?: Record<string, any>) {
    super(message, 'INSUFFICIENT_STOCK', 400, details);
  }
}
