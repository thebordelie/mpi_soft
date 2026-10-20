import { apiFetch } from './client';
import type { LogEvent } from '../types';

interface EventDto {
  id: string;
  operationId: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

function toLogEvent(dto: EventDto): LogEvent {
  return {
    id: dto.id,
    operationId: dto.operationId,
    timestamp: dto.timestamp,
    actor: dto.actor,
    action: dto.action,
    details: dto.details,
  };
}

export async function fetchOperationEvents(operationId: string): Promise<LogEvent[]> {
  const list = await apiFetch<EventDto[]>(`/api/operations/${operationId}/events`);
  return list.map(toLogEvent);
}

export async function createOperationEvent(
  operationId: string,
  payload: { action: string; details: string },
): Promise<LogEvent> {
  const dto = await apiFetch<EventDto>(`/api/operations/${operationId}/events`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return toLogEvent(dto);
}
