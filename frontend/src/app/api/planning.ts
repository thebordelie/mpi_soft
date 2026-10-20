import { apiFetch } from './client';
import type { DreamLevel, KeyEvent } from '../types';
import { toOperation, type OperationDto } from './operations';
import type { Operation } from '../types';

export interface PlanningState {
  architectureFixed: boolean;
  sedationFixed: boolean;
  scenariosFixed: boolean;
  canFinalize: boolean;
  canEditArchitecture: boolean;
  canEditSedation: boolean;
  canEditScenarios: boolean;
}

interface DreamLevelDto {
  id: string;
  name: string;
  description: string;
  goal: string;
  parentLevelId: string | null;
  participantIds: string[];
  keyEvents: KeyEventDto[];
}

interface KeyEventDto {
  id: string;
  name: string;
  description: string;
  participantIds: string[];
}

export interface SedationConfigDto {
  id: string;
  levelId: string;
  participantId: string;
  compound: string;
  dosage: number;
  durationHours: number;
  method: string;
  notes: string;
}

export interface ScenarioDto {
  id: string;
  name: string;
  levelId: string;
  participantIds: string[];
  description: string;
  trigger: string;
  expectedResult: string;
}

function toDreamLevel(dto: DreamLevelDto): DreamLevel {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    goal: dto.goal,
    parentLevelId: dto.parentLevelId,
    participantIds: dto.participantIds,
    keyEvents: dto.keyEvents.map(ke => ({
      id: ke.id,
      name: ke.name,
      description: ke.description,
      participantIds: ke.participantIds,
    })),
  };
}

function toDreamLevelPayload(level: Omit<DreamLevel, 'id'> & { id?: string }) {
  return {
    name: level.name,
    description: level.description,
    goal: level.goal,
    parentLevelId: level.parentLevelId ?? undefined,
    participantIds: level.participantIds,
    keyEvents: level.keyEvents.map((ke: KeyEvent) => ({
      name: ke.name,
      description: ke.description,
      participantIds: ke.participantIds,
    })),
  };
}

export async function fetchPlanningState(operationId: string): Promise<PlanningState> {
  return apiFetch<PlanningState>(`/api/operations/${operationId}/planning`);
}

export async function changeOperationStatus(
  operationId: string,
  status: Operation['status'],
): Promise<Operation> {
  const dto = await apiFetch<OperationDto>(`/api/operations/${operationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return toOperation(dto);
}

export async function fetchDreamLevels(operationId: string): Promise<DreamLevel[]> {
  const list = await apiFetch<DreamLevelDto[]>(`/api/operations/${operationId}/dream-levels`);
  return list.map(toDreamLevel);
}

export async function createDreamLevel(operationId: string, level: Omit<DreamLevel, 'id'>): Promise<DreamLevel> {
  const dto = await apiFetch<DreamLevelDto>(`/api/operations/${operationId}/dream-levels`, {
    method: 'POST',
    body: JSON.stringify(toDreamLevelPayload(level)),
  });
  return toDreamLevel(dto);
}

export async function updateDreamLevel(
  operationId: string,
  levelId: string,
  level: Omit<DreamLevel, 'id'>,
): Promise<DreamLevel> {
  const dto = await apiFetch<DreamLevelDto>(`/api/operations/${operationId}/dream-levels/${levelId}`, {
    method: 'PUT',
    body: JSON.stringify(toDreamLevelPayload(level)),
  });
  return toDreamLevel(dto);
}

export async function deleteDreamLevel(operationId: string, levelId: string): Promise<void> {
  await apiFetch<void>(`/api/operations/${operationId}/dream-levels/${levelId}`, {
    method: 'DELETE',
  });
}

export async function fixArchitecture(operationId: string): Promise<PlanningState> {
  return apiFetch<PlanningState>(`/api/operations/${operationId}/architecture/fix`, {
    method: 'POST',
  });
}

export async function fetchSedationConfigs(operationId: string): Promise<SedationConfigDto[]> {
  return apiFetch<SedationConfigDto[]>(`/api/operations/${operationId}/sedation-configs`);
}

export async function createSedationConfig(
  operationId: string,
  payload: Omit<SedationConfigDto, 'id'>,
): Promise<SedationConfigDto> {
  return apiFetch<SedationConfigDto>(`/api/operations/${operationId}/sedation-configs`, {
    method: 'POST',
    body: JSON.stringify({
      levelId: payload.levelId,
      participantId: payload.participantId,
      compound: payload.compound,
      dosage: payload.dosage,
      durationHours: payload.durationHours,
      method: payload.method,
      notes: payload.notes,
    }),
  });
}

export async function updateSedationConfig(
  operationId: string,
  configId: string,
  payload: Omit<SedationConfigDto, 'id'>,
): Promise<SedationConfigDto> {
  return apiFetch<SedationConfigDto>(`/api/operations/${operationId}/sedation-configs/${configId}`, {
    method: 'PUT',
    body: JSON.stringify({
      levelId: payload.levelId,
      participantId: payload.participantId,
      compound: payload.compound,
      dosage: payload.dosage,
      durationHours: payload.durationHours,
      method: payload.method,
      notes: payload.notes,
    }),
  });
}

export async function deleteSedationConfig(operationId: string, configId: string): Promise<void> {
  await apiFetch<void>(`/api/operations/${operationId}/sedation-configs/${configId}`, {
    method: 'DELETE',
  });
}

export async function fixSedation(operationId: string): Promise<PlanningState> {
  return apiFetch<PlanningState>(`/api/operations/${operationId}/sedation/fix`, {
    method: 'POST',
  });
}

export async function fetchScenarios(operationId: string): Promise<ScenarioDto[]> {
  return apiFetch<ScenarioDto[]>(`/api/operations/${operationId}/scenarios`);
}

export async function createScenario(
  operationId: string,
  payload: Omit<ScenarioDto, 'id'>,
): Promise<ScenarioDto> {
  return apiFetch<ScenarioDto>(`/api/operations/${operationId}/scenarios`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateScenario(
  operationId: string,
  scenarioId: string,
  payload: Omit<ScenarioDto, 'id'>,
): Promise<ScenarioDto> {
  return apiFetch<ScenarioDto>(`/api/operations/${operationId}/scenarios/${scenarioId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteScenario(operationId: string, scenarioId: string): Promise<void> {
  await apiFetch<void>(`/api/operations/${operationId}/scenarios/${scenarioId}`, {
    method: 'DELETE',
  });
}

export async function fixScenarios(operationId: string): Promise<PlanningState> {
  return apiFetch<PlanningState>(`/api/operations/${operationId}/scenarios/fix`, {
    method: 'POST',
  });
}
