import type { LoginResponse, SaltResponse } from '../types';
import { api } from './client';

export const authApi = {
  getSalt: (username: string) =>
    api.get<SaltResponse>(`/auth/salt?username=${encodeURIComponent(username)}`),

  register: (body: {
    username: string;
    auth_token: string;
    argon2_salt: string;
    argon2_params: { m_cost: number; t_cost: number; p_cost: number };
    classical_public_key: string;
    pq_public_key: string;
    classical_priv_encrypted: string;
    pq_priv_encrypted: string;
    turnstile_token?: string;
  }) => api.post<{ message: string }>('/auth/register', body),

  login: (username: string, auth_token: string) =>
    api.post<LoginResponse>('/auth/login', { username, auth_token }),

  deleteProfile: () =>
    api.delete<{ message: string; deleted_vaults: number }>('/auth/profile'),
};
