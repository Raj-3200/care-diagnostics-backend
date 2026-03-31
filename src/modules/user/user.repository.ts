import { prisma } from '../../config/database.js';
import { Role, User } from '@prisma/client';
import { PaginationParams } from '../../shared/types/common.types.js';

export type UserWithoutPassword = Omit<User, 'password'>;

export const findByEmail = async (email: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { email, deletedAt: null },
  });
};

export const findById = async (id: string): Promise<UserWithoutPassword | null> => {
  const user = await prisma.user.findUnique({
    where: { id, deletedAt: null },
  });

  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const findAll = async (
  pagination: PaginationParams,
): Promise<{ users: UserWithoutPassword[]; total: number }> => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({
      where: { deletedAt: null },
    }),
  ]);

  const usersWithoutPassword = users.map((user) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  return { users: usersWithoutPassword, total };
};

export const create = async (data: {
  tenantId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
}): Promise<UserWithoutPassword> => {
  const user = await prisma.user.create({
    data,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const update = async (
  id: string,
  data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: Role;
    phone?: string;
    isActive?: boolean;
  },
): Promise<UserWithoutPassword> => {
  const user = await prisma.user.update({
    where: { id, deletedAt: null },
    data,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const softDelete = async (id: string): Promise<void> => {
  await prisma.user.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
};
