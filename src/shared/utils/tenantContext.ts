import { AsyncLocalStorage } from 'async_hooks';

type TenantStore = {
  tenantId: string;
};

const tenantContext = new AsyncLocalStorage<TenantStore>();

export function runWithTenant<T>(tenantId: string, callback: () => T): T {
  return tenantContext.run({ tenantId }, callback);
}

export function getCurrentTenantId(): string | undefined {
  return tenantContext.getStore()?.tenantId;
}
