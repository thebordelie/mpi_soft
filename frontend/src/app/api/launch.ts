import { apiFetch } from './client';
import { toOperation, type OperationDto } from './operations';
import type { Operation } from '../types';

export type PasivConnectionStatus = 'disconnected' | 'connecting' | 'connected';
export type PasivChannelStatus = 'offline' | 'stable' | 'unstable';
export type SedationReadiness = 'pending' | 'confirmed' | 'rejected';

export interface PasivConnectionDto {
  id: string;
  participantId: string;
  participantLogin: string;
  participantName: string;
  participantRole: string;
  connectionStatus: PasivConnectionStatus;
  channelStatus: PasivChannelStatus;
  sedationActive: boolean;
  levelName: string;
}

export interface SedationSummaryDto {
  participantId: string;
  participantName: string;
  participantRole: string;
  compound: string;
  dosage: string;
  durationHours: string;
  method: string;
  levelName: string;
}

export interface LaunchState {
  currentStep: number;
  sedationReadiness: SedationReadiness;
  sedationRejectionReason: string | null;
  launchedAt: string | null;
  allConnected: boolean;
  canAdvanceToConfirm: boolean;
  canConfirmSedation: boolean;
  canLaunch: boolean;
  canManagePasiv: boolean;
  pasivConnections: PasivConnectionDto[];
  sedationSummaries: SedationSummaryDto[];
}

export async function fetchLaunchState(operationId: string): Promise<LaunchState> {
  return apiFetch<LaunchState>(`/api/operations/${operationId}/launch`);
}

export async function beginLaunch(operationId: string): Promise<Operation> {
  const dto = await apiFetch<OperationDto>(`/api/operations/${operationId}/launch/begin`, {
    method: 'POST',
  });
  return toOperation(dto);
}

export async function connectPasiv(operationId: string, participantId: string): Promise<PasivConnectionDto> {
  return apiFetch<PasivConnectionDto>(
    `/api/operations/${operationId}/launch/pasiv/${participantId}/connect`,
    { method: 'POST' },
  );
}

export async function disconnectPasiv(operationId: string, participantId: string): Promise<PasivConnectionDto> {
  return apiFetch<PasivConnectionDto>(
    `/api/operations/${operationId}/launch/pasiv/${participantId}/disconnect`,
    { method: 'POST' },
  );
}

export async function advanceLaunchStep(operationId: string): Promise<LaunchState> {
  return apiFetch<LaunchState>(`/api/operations/${operationId}/launch/advance-step`, {
    method: 'POST',
  });
}

export async function confirmSedation(operationId: string): Promise<LaunchState> {
  return apiFetch<LaunchState>(`/api/operations/${operationId}/launch/confirm-sedation`, {
    method: 'POST',
  });
}

export async function rejectSedation(operationId: string, rejectionReason: string): Promise<Operation> {
  const result = await apiFetch<{ operation: OperationDto }>(
    `/api/operations/${operationId}/launch/reject-sedation`,
    {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    },
  );
  return toOperation(result.operation);
}

export async function executeLaunch(operationId: string): Promise<{ operation: Operation; launch: LaunchState }> {
  const result = await apiFetch<{ operation: OperationDto; launch: LaunchState }>(
    `/api/operations/${operationId}/launch/execute`,
    { method: 'POST' },
  );
  return { operation: toOperation(result.operation), launch: result.launch };
}

export async function completeOperation(operationId: string): Promise<{ operation: Operation; launch: LaunchState }> {
  const result = await apiFetch<{ operation: OperationDto; launch: LaunchState }>(
    `/api/operations/${operationId}/launch/complete`,
    { method: 'POST' },
  );
  return { operation: toOperation(result.operation), launch: result.launch };
}
