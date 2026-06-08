import apiClient from '@/lib/api-client';
import type { ApiResponse, Visit } from '@/types';

export async function listVisits(query?: URLSearchParams): Promise<ApiResponse<Visit[]>> {
  const suffix = query ? `?${query.toString()}` : '';
  const { data } = await apiClient.get<ApiResponse<Visit[]>>(`/visits${suffix}`);
  return data;
}

export async function getVisit(id: string): Promise<ApiResponse<Visit>> {
  const { data } = await apiClient.get<ApiResponse<Visit>>(`/visits/${id}`);
  return data;
}

export async function createVisit(payload: Record<string, unknown>): Promise<ApiResponse<Visit>> {
  const { data } = await apiClient.post<ApiResponse<Visit>>('/visits', payload);
  return data;
}
