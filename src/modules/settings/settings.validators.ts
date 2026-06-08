import { z } from 'zod';

const optionalText = (max = 500) => z.string().trim().max(max).optional();
const optionalUrl = z.string().trim().url('Invalid URL').or(z.literal('')).optional();
const optionalEmail = z.string().trim().email('Invalid email').or(z.literal('')).optional();

export const updateLabSettingsSchema = z.object({
  name: z.string().trim().min(2, 'Lab name must be at least 2 characters').max(255).optional(),
  logoUrl: optionalUrl,
  address: optionalText(1000),
  phone: optionalText(20),
  email: optionalEmail,
  reportPrefix: optionalText(20),
  invoicePrefix: optionalText(20),
});

export type UpdateLabSettingsInput = z.infer<typeof updateLabSettingsSchema>;
