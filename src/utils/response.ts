import { Response } from 'express';

export const ok = (res: Response, message: string, data: unknown = {}) =>
  res.status(200).json({ success: true, message, data });

export const created = (res: Response, message: string, data: unknown = {}) =>
  res.status(201).json({ success: true, message, data });

export const err = (res: Response, status: number, message: string, errors: unknown = {}) =>
  res.status(status).json({ success: false, message, errors });
