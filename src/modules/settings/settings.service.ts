import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import type { UpdateLabSettingsInput } from './settings.validators.js';

const tenantSelect = {
  id: true,
  name: true,
  slug: true,
  address: true,
  phone: true,
  email: true,
  logoUrl: true,
  planTier: true,
  settings: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getLabSettings(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: tenantSelect,
  });

  if (!tenant) {
    throw new NotFoundError('Lab settings not found');
  }

  return tenant;
}

export async function updateLabSettings(tenantId: string, input: UpdateLabSettingsInput) {
  const existing = await getLabSettings(tenantId);
  const existingSettings =
    existing.settings && typeof existing.settings === 'object' && !Array.isArray(existing.settings)
      ? existing.settings
      : {};

  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl || null } : {}),
      ...(input.address !== undefined ? { address: input.address || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      settings: {
        ...existingSettings,
        ...(input.reportPrefix !== undefined ? { reportPrefix: input.reportPrefix || 'CD-RPT' } : {}),
        ...(input.invoicePrefix !== undefined ? { invoicePrefix: input.invoicePrefix || 'CD-INV' } : {}),
      },
    },
    select: tenantSelect,
  });
}
