import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors/AppError.js';
import { sendError } from '../shared/utils/apiResponse.js';
import { env } from '../config/env.js';

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): Response => {
  // Log error
  console.error('Error:', {
    message: error.message,
    stack: env.NODE_ENV === 'development' ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  // Handle AppError instances
  if (error instanceof AppError) {
    return sendError(res, error.message, error.statusCode, error.code);
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(
      res,
      'Validation failed',
      StatusCodes.BAD_REQUEST,
      'VALIDATION_ERROR',
      details,
    );
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      const target = (error.meta?.target as string[]) || [];
      return sendError(
        res,
        `Duplicate value for field: ${target.join(', ')}`,
        StatusCodes.CONFLICT,
        'DUPLICATE_ERROR',
      );
    }

    // Record not found
    if (error.code === 'P2025') {
      return sendError(res, 'Record not found', StatusCodes.NOT_FOUND, 'NOT_FOUND');
    }

    // Foreign key constraint failed
    if (error.code === 'P2003') {
      return sendError(
        res,
        'Foreign key constraint failed',
        StatusCodes.BAD_REQUEST,
        'FOREIGN_KEY_ERROR',
      );
    }
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return sendError(res, 'Invalid data provided', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR');
  }

  // Default error response
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : error.message;
  return sendError(res, message, StatusCodes.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR');
};
