import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendSuccess } from '../../shared/utils/apiResponse.js';
import type { AuthenticatedRequest } from '../../shared/types/auth.types.js';
import { getLabSettings, updateLabSettings } from './settings.service.js';
import type { UpdateLabSettingsInput } from './settings.validators.js';

export const getLab = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const settings = await getLabSettings(req.user!.tenantId);
    sendSuccess(res, settings, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

export const updateLab = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const settings = await updateLabSettings(
      req.user!.tenantId,
      req.body as UpdateLabSettingsInput,
    );
    sendSuccess(res, settings, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};
