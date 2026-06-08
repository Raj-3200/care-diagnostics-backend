import axios from 'axios';
import apiClient, { API_BASE_URL } from './api-client';
import type { ApiResponse } from '@/types';

export { API_BASE_URL };
export default apiClient;

// Helper to extract error message.
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const { data, status } = error.response ?? {};

    if (data && typeof data === 'object' && 'error' in data) {
      const response = data as ApiResponse;
      if (response.error?.message) return response.error.message;
    }

    if (typeof data === 'string' && data.trim()) {
      if (data.trimStart().startsWith('<')) {
        if (status === 404) return 'API route not found. Please check the backend URL configuration.';
        return 'The server returned an unexpected HTML response.';
      }
      return data;
    }
    if (status === 429) return 'Too many requests. Please wait a few minutes and try again.';

    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
