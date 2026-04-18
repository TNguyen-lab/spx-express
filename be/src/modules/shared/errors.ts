import type { Response } from 'express';
import { ZodError } from 'zod';

type PrismaLikeError = {
  code?: string;
  message?: string;
};

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code = 'APP_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(message, 404, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions', details?: unknown) {
    super(message, 403, 'FORBIDDEN', details);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: unknown) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

function isPrismaLikeError(error: unknown): error is PrismaLikeError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

export function sendRouteError(res: Response, error: unknown, fallbackMessage = 'Internal server error'): void {
  if (error instanceof ZodError) {
    res.status(400).json({ error: error.errors });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message, code: error.code, details: error.details });
    return;
  }

  if (error instanceof Error) {
    const msg = error.message;

    if (msg === 'Insufficient permissions') {
      res.status(403).json({ error: msg });
      return;
    }

    if (msg.includes('not found') || msg.includes('not exist') || msg.includes('không tồn tại')) {
      res.status(404).json({ error: msg });
      return;
    }

    if (msg.includes('Invalid transition') || msg.includes('is not allowed to transition')) {
      res.status(400).json({ error: msg });
      return;
    }

    if (msg.includes('Only') || msg.includes('chỉ có thể') || msg.includes('must be') || msg.includes('required')) {
      res.status(400).json({ error: msg });
      return;
    }

    if (msg.includes('Insufficient') || msg.includes('insufficient') || msg.includes('không đủ')) {
      res.status(400).json({ error: msg });
      return;
    }

    if (msg.includes('No warehouse locations available') || msg.includes('already have locations')) {
      res.status(400).json({ error: msg });
      return;
    }

    if (msg.includes('not in') || msg.includes('not in progress') || msg.includes('not found or')) {
      res.status(400).json({ error: msg });
      return;
    }
  }

  if (isPrismaLikeError(error)) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Bản ghi đã tồn tại. Record already exists.' });
      return;
    }

    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Tham chiếu không hợp lệ. Invalid reference: the specified related record does not exist.' });
      return;
    }

    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Không tìm thấy bản ghi. Record not found.' });
      return;
    }
  }

  console.error(error);
  res.status(500).json({ error: fallbackMessage });
}
