import { HttpStatus } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export function isMalformedJsonError(
  error: unknown,
): error is Error & Readonly<{ status: 400; type: 'entity.parse.failed' }> {
  return (
    error instanceof Error &&
    'type' in error &&
    'status' in error &&
    error.type === 'entity.parse.failed' &&
    error.status === HttpStatus.BAD_REQUEST
  );
}

export function malformedJsonErrorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (!isMalformedJsonError(error)) {
    next(error);
    return;
  }

  response.status(HttpStatus.BAD_REQUEST).json({
    accepted: 0,
    rejected: [],
  });
}
