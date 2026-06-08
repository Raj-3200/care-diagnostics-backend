import apiClient from '@/lib/api-client';
import type { ApiResponse, Test } from '@/types';

export async function listTests(query?: URLSearchParams): Promise<ApiResponse<Test[]>> {
  const suffix = query ? `?${query.toString()}` : '';
  const { data } = await apiClient.get<ApiResponse<Test[]>>(`/tests${suffix}`);
  return data;
}

export async function getTest(id: string): Promise<ApiResponse<Test>> {
  const { data } = await apiClient.get<ApiResponse<Test>>(`/tests/${id}`);
  return data;
}

export async function createTest(payload: Partial<Test>): Promise<ApiResponse<Test>> {
  const { data } = await apiClient.post<ApiResponse<Test>>('/tests', payload);
  return data;
}
