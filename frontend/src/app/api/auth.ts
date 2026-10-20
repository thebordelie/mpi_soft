import { apiFetch } from './client';
import type { AuthSession, AuthUser } from '../types';

interface AuthResponseDto {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
  privileges: string[];
}

interface MeResponseDto {
  user: AuthUser;
  privileges: string[];
}

export interface LoginPayload {
  login: string;
  password: string;
}

export interface RegisterPayload {
  login: string;
  fullName: string;
  role: string;
  password: string;
}

function toSession(dto: AuthResponseDto): AuthSession {
  return {
    accessToken: dto.accessToken,
    tokenType: dto.tokenType,
    expiresIn: dto.expiresIn,
    user: dto.user,
    privileges: dto.privileges,
  };
}

export async function loginRequest(payload: LoginPayload): Promise<AuthSession> {
  const response = await apiFetch<AuthResponseDto>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return toSession(response);
}

export async function registerRequest(payload: RegisterPayload): Promise<AuthSession> {
  const response = await apiFetch<AuthResponseDto>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return toSession(response);
}

export async function meRequest(token: string): Promise<MeResponseDto> {
  return apiFetch<MeResponseDto>('/api/auth/me', { method: 'GET' }, token);
}
