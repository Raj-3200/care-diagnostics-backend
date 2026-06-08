import apiClient from '@/lib/api-client';
import type { ApiResponse, Sample } from '@/types';

export async function listSamples(query?: URLSearchParams): Promise<ApiResponse<Sample[]>> {
  const suffix = query ? `?${query.toString()}` : '';
  const { data } = await apiClient.get<ApiResponse<Sample[]>>(`/samples${suffix}`);
  return data;
}

export async function collectSample(testOrderId: string): Promise<ApiResponse<Sample>> {
  const { data } = await apiClient.post<ApiResponse<Sample>>('/samples/collect', { testOrderId });
  return data;
}

export async function receiveSample(sampleId: string): Promise<ApiResponse<Sample>> {
  const { data } = await apiClient.patch<ApiResponse<Sample>>(`/samples/${sampleId}/receive`);
  return data;
}
