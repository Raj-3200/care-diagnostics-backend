import * as userRepository from './user.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import { hashPassword } from '../../shared/utils/password.js';
import { PaginationParams } from '../../shared/types/common.types.js';
import { prisma } from '../../config/database.js';
import { CONSTANTS } from '../../config/constants.js';
import { CreateUserInput, UpdateUserInput } from './user.validators.js';
import { env } from '../../config/env.js';

export const createUser = async (data: CreateUserInput, createdByUserId?: string) => {
  // Check for duplicate email
  const existingUser = await userRepository.findByEmail(data.email);
  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(data.password);

  // Create user
  const user = await userRepository.create({
    ...data,
    tenantId: env.DEFAULT_TENANT_ID,
    password: hashedPassword,
  });

  // Create audit log
  if (createdByUserId) {
    await prisma.auditLog.create({
      data: {
        userId: createdByUserId,
        action: CONSTANTS.AUDIT_ACTIONS.USER_CREATED,
        entity: 'User',
        entityId: user.id,
        newValue: { email: user.email, role: user.role },
      },
    });
  }

  return user;
};

export const getAllUsers = async (pagination: PaginationParams) => {
  return userRepository.findAll(pagination);
};

export const getUserById = async (id: string) => {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
};

export const updateUser = async (id: string, data: UpdateUserInput, updatedByUserId?: string) => {
  // Check if user exists
  const existingUser = await userRepository.findById(id);
  if (!existingUser) {
    throw new NotFoundError('User not found');
  }

  // Check for duplicate email if email is being updated
  if (data.email && data.email !== existingUser.email) {
    const userWithEmail = await userRepository.findByEmail(data.email);
    if (userWithEmail) {
      throw new ConflictError('User with this email already exists');
    }
  }

  // Update user
  const user = await userRepository.update(id, data);

  // Create audit log
  if (updatedByUserId) {
    await prisma.auditLog.create({
      data: {
        userId: updatedByUserId,
        action: CONSTANTS.AUDIT_ACTIONS.USER_UPDATED,
        entity: 'User',
        entityId: user.id,
        oldValue: { id: existingUser.id, email: existingUser.email, role: existingUser.role },
        newValue: { id: user.id, email: user.email, role: user.role },
      },
    });
  }

  return user;
};

export const deleteUser = async (id: string, deletedByUserId?: string) => {
  // Check if user exists
  const existingUser = await userRepository.findById(id);
  if (!existingUser) {
    throw new NotFoundError('User not found');
  }

  // Soft delete user
  await userRepository.softDelete(id);

  // Create audit log
  if (deletedByUserId) {
    await prisma.auditLog.create({
      data: {
        userId: deletedByUserId,
        action: CONSTANTS.AUDIT_ACTIONS.USER_DELETED,
        entity: 'User',
        entityId: id,
        oldValue: { id: existingUser.id, email: existingUser.email, role: existingUser.role },
      },
    });
  }
};
