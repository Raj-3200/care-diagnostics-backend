import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ApiResponse } from '../types/api.types.js';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = StatusCodes.OK,
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message: statusCode === StatusCodes.CREATED ? 'Created' : 'OK',
    data,
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
  code?: string,
  details?: unknown,
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    errors: details ?? {},
    error: {
      message,
      code,
      details,
    },
  };
  return res.status(statusCode).json(response);
};

export const sendPaginated = <T>(
  res: Response,
  items: T[],
  page: number,
  limit: number,
  total: number,
  statusCode: number = StatusCodes.OK,
): Response => {
  const totalPages = Math.ceil(total / limit);
  const response: ApiResponse<T[]> = {
    success: true,
    message: 'OK',
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
  return res.status(statusCode).json(response);
};
