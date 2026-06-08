import apiClient from '@/lib/api-client';
import axios from 'axios';
import type { ApiResponse, Report } from '@/types';

export async function listReports(query?: URLSearchParams): Promise<ApiResponse<Report[]>> {
  const suffix = query ? `?${query.toString()}` : '';
  const { data } = await apiClient.get<ApiResponse<Report[]>>(`/reports${suffix}`);
  return data;
}

export async function getReport(id: string): Promise<ApiResponse<Report>> {
  const { data } = await apiClient.get<ApiResponse<Report>>(`/reports/${id}`);
  return data;
}

export async function generateReport(reportId: string): Promise<ApiResponse<Report>> {
  const { data } = await apiClient.patch<ApiResponse<Report>>(`/reports/${reportId}/generate`);
  return data;
}

export async function approveReport(reportId: string): Promise<ApiResponse<Report>> {
  const { data } = await apiClient.patch<ApiResponse<Report>>(`/reports/${reportId}/approve`);
  return data;
}

export async function dispatchReport(reportId: string): Promise<ApiResponse<Report>> {
  const { data } = await apiClient.patch<ApiResponse<Report>>(`/reports/${reportId}/dispatch`);
  return data;
}

export async function downloadReportPdf(reportId: string): Promise<Blob> {
  try {
    const { data } = await apiClient.get<Blob>(`/reports/${reportId}/download`, {
      responseType: 'blob',
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      const text = await error.response.data.text();
      let message = text;

      try {
        const body = JSON.parse(text) as ApiResponse;
        message = body.error?.message || message;
      } catch {
        message = text;
      }

      throw new Error(message || error.message);
    }

    throw error;
  }
}
