import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Graceful disconnect
let disconnectPromise: Promise<void> | null = null;

const disconnect = async () => {
  if (!disconnectPromise) {
    disconnectPromise = prisma.$disconnect().then(() => {
      console.log('🔌 Database connection closed');
    });
  }

  await disconnectPromise;
};

export { prisma, disconnect };
