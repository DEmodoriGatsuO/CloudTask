import { api } from './client';
import type { User } from '@cloudtask/shared';

interface AuthResponse {
  data: {
    user: User;
    token: string;
  };
}

interface MeResponse {
  data: User;
}

export function loginApi(email: string, password: string) {
  return api.post<AuthResponse>('/auth/login', { email, password });
}

export function registerApi(email: string, password: string, displayName: string) {
  return api.post<AuthResponse>('/auth/register', { email, password, displayName });
}

export function logoutApi() {
  return api.post<{ data: { message: string } }>('/auth/logout');
}

export function getMeApi() {
  return api.get<MeResponse>('/auth/me');
}
