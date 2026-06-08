import apiClient from '@/lib/api-client';
import type { ApiResponse, TestOrder } from '@/types';

export async function listOrders(query?: URLSearchParams): Promise<ApiResponse<TestOrder[]>> {
  const suffix = query ? `?${query.toString()}` : '';
  const { data } = await apiClient.get<ApiResponse<TestOrder[]>>(`/test-orders${suffix}`);
  return data;
}

export async function getOrder(id: string): Promise<ApiResponse<TestOrder>> {
  const { data } = await apiClient.get<ApiResponse<TestOrder>>(`/test-orders/${id}`);
  return data;
}

export async function createBulkOrders(
  payload: Record<string, unknown>,
): Promise<ApiResponse<TestOrder[]>> {
  const { data } = await apiClient.post<ApiResponse<TestOrder[]>>('/test-orders/bulk', payload);
  return data;
}
