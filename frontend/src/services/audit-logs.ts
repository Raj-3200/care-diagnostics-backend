import apiClient from '@/lib/api-client';
import type { ApiResponse, AuditLog } from '@/types';

export async function listAuditLogs(query?: URLSearchParams): Promise<ApiResponse<AuditLog[]>> {
  const suffix = query ? `?${query.toString()}` : '';
  const { data } = await apiClient.get<ApiResponse<AuditLog[]>>(`/audit-logs${suffix}`);
  return data;
}
