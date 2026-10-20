import { apiFetch } from './client';
import type { Operation, Participant, ParticipantRole } from '../types';

export interface OperationDto {
  id: string;
  requestId?: string;
  name: string;
  status: Operation['status'];
  targetFullName: string;
  targetBirthDate: string;
  targetDescription: string;
  customerFullName: string;
  customerCompany: string;
  date: string;
  successCriteria: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  participants?: ParticipantDto[];
}

interface ParticipantDto {
  id: string;
  login: string;
  name: string;
  role: ParticipantRole;
}

function toParticipant(dto: ParticipantDto): Participant {
  return {
    id: dto.id,
    login: dto.login,
    name: dto.name,
    role: dto.role,
  };
}

export function toOperation(dto: OperationDto): Operation {
  return {
    id: dto.id,
    name: dto.name,
    status: dto.status,
    target: {
      fullName: dto.targetFullName,
      birthDate: dto.targetBirthDate ?? '',
      description: dto.targetDescription,
    },
    customer: {
      fullName: dto.customerFullName,
      company: dto.customerCompany ?? '',
    },
    date: dto.date ?? '',
    successCriteria: dto.successCriteria,
    createdBy: dto.createdBy,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toParticipants(dto: OperationDto): Participant[] {
  return (dto.participants ?? []).map(toParticipant);
}

export async function fetchOperationParticipants(operationId: string): Promise<Participant[]> {
  const list = await apiFetch<ParticipantDto[]>(`/api/operations/${operationId}/participants`);
  return list.map(toParticipant);
}

export async function addOperationParticipant(
  operationId: string,
  payload: { login: string; role: ParticipantRole },
): Promise<Participant> {
  const dto = await apiFetch<ParticipantDto>(`/api/operations/${operationId}/participants`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return toParticipant(dto);
}

export async function updateOperationParticipant(
  operationId: string,
  participantId: string,
  role: ParticipantRole,
): Promise<Participant> {
  const dto = await apiFetch<ParticipantDto>(
    `/api/operations/${operationId}/participants/${participantId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ role }),
    },
  );
  return toParticipant(dto);
}

export async function deleteOperationParticipant(
  operationId: string,
  participantId: string,
): Promise<void> {
  await apiFetch<void>(`/api/operations/${operationId}/participants/${participantId}`, {
    method: 'DELETE',
  });
}

export async function fetchOperations(): Promise<OperationDto[]> {
  return apiFetch<OperationDto[]>('/api/operations');
}

function toUpdatePayload(operation: Operation) {
  return {
    name: operation.name,
    targetFullName: operation.target.fullName,
    targetBirthDate: operation.target.birthDate || undefined,
    targetDescription: operation.target.description,
    customerLogin: operation.customer.fullName,
    customerCompany: operation.customer.company,
    plannedDate: operation.date || undefined,
    successCriteria: operation.successCriteria,
  };
}

export async function updateOperation(operationId: string, operation: Operation): Promise<Operation> {
  const dto = await apiFetch<OperationDto>(`/api/operations/${operationId}`, {
    method: 'PUT',
    body: JSON.stringify(toUpdatePayload(operation)),
  });
  return toOperation(dto);
}

export interface ApproveResult {
  request: import('../types').OperationRequest;
  operation: OperationDto;
}

export async function approveRequest(
  requestId: string,
  participants: { login: string; role: ParticipantRole }[],
): Promise<ApproveResult> {
  return apiFetch<ApproveResult>(`/api/requests/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ participants }),
  });
}
