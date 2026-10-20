import { apiFetch } from './client';
import type { OperationRequest, RequestGoal } from '../types';

export interface RequestPayload {
  name?: string;
  description?: string;
  plannedDate?: string;
  targetFullName?: string;
  targetBirthDate?: string;
  targetDescription?: string;
  targetBehavior?: string;
  goal?: RequestGoal | null;
  desiredResult?: string;
  successCriteria?: string;
  organizerLogin?: string;
  organization?: string;
}

interface RequestDto {
  id: string;
  status: OperationRequest['status'];
  name: string;
  description: string;
  plannedDate: string;
  targetFullName: string;
  targetBirthDate: string;
  targetDescription: string;
  targetBehavior: string;
  goal: RequestGoal | null;
  desiredResult: string;
  successCriteria: string;
  organizerLogin: string;
  organization: string;
  rejectionReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function toOperationRequest(dto: RequestDto): OperationRequest {
  return {
    id: dto.id,
    status: dto.status,
    name: dto.name,
    description: dto.description,
    plannedDate: dto.plannedDate ?? '',
    targetFullName: dto.targetFullName,
    targetBirthDate: dto.targetBirthDate ?? '',
    targetDescription: dto.targetDescription,
    targetBehavior: dto.targetBehavior,
    goal: dto.goal ?? '',
    desiredResult: dto.desiredResult,
    successCriteria: dto.successCriteria,
    organizerLogin: dto.organizerLogin,
    organization: dto.organization ?? '',
    rejectionReason: dto.rejectionReason,
    createdBy: dto.createdBy,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function formToPayload(form: {
  name: string;
  description: string;
  plannedDate: string;
  targetFullName: string;
  targetBirthDate: string;
  targetDescription: string;
  targetBehavior: string;
  goal: RequestGoal | '';
  desiredResult: string;
  successCriteria: string;
  organizerLogin: string;
  organization: string;
}): RequestPayload {
  return {
    name: form.name,
    description: form.description,
    plannedDate: form.plannedDate || undefined,
    targetFullName: form.targetFullName,
    targetBirthDate: form.targetBirthDate || undefined,
    targetDescription: form.targetDescription,
    targetBehavior: form.targetBehavior,
    goal: form.goal || null,
    desiredResult: form.desiredResult,
    successCriteria: form.successCriteria,
    organizerLogin: form.organizerLogin || undefined,
    organization: form.organization || undefined,
  };
}

export async function fetchRequests(): Promise<OperationRequest[]> {
  const data = await apiFetch<RequestDto[]>('/api/requests');
  return data.map(toOperationRequest);
}

export async function createRequest(payload: RequestPayload, submit: boolean): Promise<OperationRequest> {
  const data = await apiFetch<RequestDto>(`/api/requests?submit=${submit}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return toOperationRequest(data);
}

export async function updateRequest(id: string, payload: RequestPayload): Promise<OperationRequest> {
  const data = await apiFetch<RequestDto>(`/api/requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return toOperationRequest(data);
}

export async function submitRequest(id: string): Promise<OperationRequest> {
  const data = await apiFetch<RequestDto>(`/api/requests/${id}/submit`, { method: 'POST' });
  return toOperationRequest(data);
}

export async function rejectRequest(id: string, rejectionReason: string): Promise<OperationRequest> {
  const data = await apiFetch<RequestDto>(`/api/requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejectionReason }),
  });
  return toOperationRequest(data);
}

export async function deleteRequest(id: string): Promise<void> {
  await apiFetch<void>(`/api/requests/${id}`, { method: 'DELETE' });
}
