import { prisma } from '../../config/database.js';

/**
 * Generate a unique Medical Record Number (MRN) in the format: CD-YYYYMMDD-XXXX
 * where XXXX is a zero-padded sequential number for the day
 */
export const generateMRN = async (): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `CD-${dateStr}-`;

  // Find the count of patients created today
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const count = await prisma.patient.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  });

  const sequenceNumber = String(count + 1).padStart(4, '0');
  return `${prefix}${sequenceNumber}`;
};
