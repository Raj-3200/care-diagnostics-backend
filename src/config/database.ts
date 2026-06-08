import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env.js';
import { getCurrentTenantId } from '../shared/utils/tenantContext.js';

const tenantScopedModels = new Set([
  'User',
  'Patient',
  'Visit',
  'Test',
  'TestOrder',
  'Sample',
  'Result',
  'Report',
  'Invoice',
  'RolePermission',
  'EventLog',
  'Notification',
  'ClientReport',
]);

const readOperations = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
]);

type TenantArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Record<string, unknown>[];
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
};

function withTenantWhere(where: Record<string, unknown> | undefined, tenantId: string) {
  if (!where) return { tenantId };
  return { ...where, tenantId };
}

function withTenantData(
  data: Record<string, unknown> | Record<string, unknown>[] | undefined,
  tenantId: string,
) {
  if (!data) return data;
  if (Array.isArray(data)) return data.map((item) => ({ ...item, tenantId }));
  return { ...data, tenantId };
}

const prismaClientSingleton = () => {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenantId = getCurrentTenantId();
          if (!tenantId || !model || !tenantScopedModels.has(model)) {
            return query(args);
          }

          const scopedArgs = { ...(args as TenantArgs) };

          if (readOperations.has(operation)) {
            scopedArgs.where = withTenantWhere(scopedArgs.where, tenantId);
          }

          if (operation === 'create' || operation === 'createMany') {
            scopedArgs.data = withTenantData(scopedArgs.data, tenantId);
          }

          if (operation === 'upsert') {
            scopedArgs.where = withTenantWhere(scopedArgs.where, tenantId);
            scopedArgs.create = withTenantData(scopedArgs.create, tenantId) as
              | Record<string, unknown>
              | undefined;
          }

          return query(scopedArgs);
        },
      },
    },
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
      console.info('🔌 Database connection closed');
    });
  }

  await disconnectPromise;
};

export { prisma, disconnect };
