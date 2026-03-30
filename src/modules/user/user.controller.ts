import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as userService from './user.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse.js';
import { AuthenticatedRequest } from '../../shared/types/auth.types.js';
import { CreateUserInput, UpdateUserInput } from './user.validators.js';

export const createUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = req.body as CreateUserInput;
    const user = await userService.createUser(body, req.user?.userId);
    sendSuccess(res, user, StatusCodes.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { page, limit } = req.query;
    const { users, total } = await userService.getAllUsers({
      page: Number(page),
      limit: Number(limit),
    });
    sendPaginated(res, users, Number(page), Number(limit), total);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    sendSuccess(res, user, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as UpdateUserInput;
    const user = await userService.updateUser(id, body, req.user?.userId);
    sendSuccess(res, user, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id, req.user?.userId);
    sendSuccess(res, { message: 'User deleted successfully' }, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};
