import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../shared/errors/AppError.js';

export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed: unknown = schema.parse(
        source === 'body' ? req.body : source === 'query' ? req.query : req.params,
      );

      if (source === 'body') {
        req.body = parsed;
      } else if (source === 'query') {
        (req as { query: typeof req.query }).query = parsed as Request['query'];
      } else {
        (req as { params: typeof req.params }).params = parsed as Request['params'];
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
};
