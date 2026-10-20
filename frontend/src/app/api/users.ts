import { apiFetch } from './client';

export interface OrganizerDto {
  login: string;
  fullName: string;
}

export async function fetchOrganizers(): Promise<OrganizerDto[]> {
  return apiFetch<OrganizerDto[]>('/api/users/organizers');
}

export interface UserLookupDto {
  login: string;
  fullName: string;
  role: string;
}

export async function lookupUser(login: string): Promise<UserLookupDto> {
  const params = new URLSearchParams({ login: login.trim() });
  return apiFetch<UserLookupDto>(`/api/users/lookup?${params}`);
}
