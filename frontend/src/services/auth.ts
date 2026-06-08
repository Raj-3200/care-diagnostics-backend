import apiClient from '@/lib/api-client';
import type { ApiResponse, LoginRequest, LoginResponse, User } from '@/types';

export async function login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
  return data;
}

export async function logout(): Promise<ApiResponse<{ message: string }>> {
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>('/auth/logout');
  return data;
}

export async function getCurrentUser(): Promise<ApiResponse<User>> {
  const { data } = await apiClient.get<ApiResponse<User>>('/auth/me');
  return data;
}
