import apiClient from '@/lib/api-client';
import type { ApiResponse, Patient } from '@/types';

export async function listPatients(query?: URLSearchParams): Promise<ApiResponse<Patient[]>> {
  const suffix = query ? `?${query.toString()}` : '';
  const { data } = await apiClient.get<ApiResponse<Patient[]>>(`/patients${suffix}`);
  return data;
}

export async function getPatient(id: string): Promise<ApiResponse<Patient>> {
  const { data } = await apiClient.get<ApiResponse<Patient>>(`/patients/${id}`);
  return data;
}

export async function createPatient(payload: Partial<Patient>): Promise<ApiResponse<Patient>> {
  const { data } = await apiClient.post<ApiResponse<Patient>>('/patients', payload);
  return data;
}
