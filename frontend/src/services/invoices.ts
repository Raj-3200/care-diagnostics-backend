import apiClient from '@/lib/api-client';
import type { ApiResponse, Invoice } from '@/types';

export async function listInvoices(query?: URLSearchParams): Promise<ApiResponse<Invoice[]>> {
  const suffix = query ? `?${query.toString()}` : '';
  const { data } = await apiClient.get<ApiResponse<Invoice[]>>(`/invoices${suffix}`);
  return data;
}

export async function createInvoice(visitId: string): Promise<ApiResponse<Invoice>> {
  const { data } = await apiClient.post<ApiResponse<Invoice>>('/invoices', { visitId });
  return data;
}

export async function recordPayment(
  invoiceId: string,
  payload: Record<string, unknown>,
): Promise<ApiResponse<Invoice>> {
  const { data } = await apiClient.post<ApiResponse<Invoice>>(
    `/invoices/${invoiceId}/payment`,
    payload,
  );
  return data;
}
