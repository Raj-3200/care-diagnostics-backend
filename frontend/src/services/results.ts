import apiClient from '@/lib/api-client';
import type { ApiResponse, Result } from '@/types';

export async function listResults(query?: URLSearchParams): Promise<ApiResponse<Result[]>> {
  const suffix = query ? `?${query.toString()}` : '';
  const { data } = await apiClient.get<ApiResponse<Result[]>>(`/results${suffix}`);
  return data;
}

export async function enterResult(
  resultId: string,
  payload: Record<string, unknown>,
): Promise<ApiResponse<Result>> {
  const { data } = await apiClient.patch<ApiResponse<Result>>(
    `/results/${resultId}/enter`,
    payload,
  );
  return data;
}

export async function verifyResult(resultId: string): Promise<ApiResponse<Result>> {
  const { data } = await apiClient.patch<ApiResponse<Result>>(`/results/${resultId}/verify`);
  return data;
}
