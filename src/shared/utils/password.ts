import bcrypt from 'bcrypt';
import { CONSTANTS } from '../../config/constants.js';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, CONSTANTS.PASSWORD.BCRYPT_ROUNDS);
};

export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};
