import apiClient from '@/lib/api-client';
import type { ApiResponse, LabSettings } from '@/types';

export type LabSettingsPayload = Partial<
  Pick<LabSettings, 'name' | 'logoUrl' | 'address' | 'phone' | 'email'>
> & {
  reportPrefix?: string;
  invoicePrefix?: string;
};

export async function getLabSettings(): Promise<ApiResponse<LabSettings>> {
  const { data } = await apiClient.get<ApiResponse<LabSettings>>('/settings/lab');
  return data;
}

export async function updateLabSettings(
  payload: LabSettingsPayload,
): Promise<ApiResponse<LabSettings>> {
  const { data } = await apiClient.patch<ApiResponse<LabSettings>>('/settings/lab', payload);
  return data;
}

export async function getBillingSettings(): Promise<ApiResponse<LabSettings>> {
  const { data } = await apiClient.get<ApiResponse<LabSettings>>('/settings/billing');
  return data;
}
