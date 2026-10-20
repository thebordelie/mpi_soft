import { useState, useCallback, useEffect } from 'react';
import { Operation, Participant, User } from '../types';
import { OperationEditor } from './OperationEditor';
import { EventLog } from './EventLog';
import { Participants } from './Participants';
import { DreamArchitecture } from './DreamArchitecture';
import { Sedation } from './Sedation';
import { Scenarios } from './Scenarios';
import { LaunchOperation } from './LaunchOperation';
import { fetchPlanningState, type PlanningState } from '../api/planning';
import { beginLaunch } from '../api/launch';
import { ApiError } from '../api/client';
import {
  Box, Typography, AppBar, Toolbar, Tabs, Tab,
  IconButton, Chip, Container, Button, Tooltip, Alert, Stack,
} from '@mui/material';
import { ArrowBack, PlayArrow, Lock, RocketLaunch, CheckCircle, Science } from '@mui/icons-material';

const ROLE_LABELS: Record<string, string> = {
  organizer: 'Организатор', customer: 'Заказчик', architect: 'Архитектор',
  chemist: 'Химик', impersonator: 'Имперсонатор', extractor: 'Извлекатель',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик', planning: 'Планирование', active: 'В работе',
  ready: 'Готова к запуску', launch: 'Запуск', running: 'Во сне', completed: 'Завершена', cancelled: 'Отменена',
};

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error' | 'info'> = {
  draft: 'default', planning: 'primary', active: 'warning',
  ready: 'info', launch: 'warning', running: 'success', completed: 'success', cancelled: 'error',
};

interface OperationDetailProps {
  operation: Operation;
  participants: Participant[];
  currentUser: User;
  onClose: () => void;
  onSave: (operation: Operation) => void | Promise<void>;
  onStatusChange: (operationId: string, newStatus: Operation['status']) => Promise<void>;
  onOperationUpdate: (operation: Operation) => void;
  onParticipantsChange: (participants: Participant[]) => void;
  canManageParticipants: boolean;
  canStartPlanning: boolean;
  canFinalizeOperation: boolean;
  canLaunchOperation: boolean;
  canConfirmPasiv: boolean;
}

export function OperationDetail({
  operation, participants,
  currentUser, onClose, onSave, onStatusChange,
  onOperationUpdate,
  onParticipantsChange,
  canManageParticipants,
  canStartPlanning,
  canFinalizeOperation,
  canLaunchOperation,
  canConfirmPasiv,
}: OperationDetailProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [eventRefreshKey, setEventRefreshKey] = useState(0);
  const [planningState, setPlanningState] = useState<PlanningState | null>(null);
  const [statusError, setStatusError] = useState('');

  const reloadPlanning = useCallback(async () => {
    try {
      setPlanningState(await fetchPlanningState(operation.id));
    } catch {
      setPlanningState(null);
    }
  }, [operation.id]);

  useEffect(() => {
    reloadPlanning();
  }, [reloadPlanning, operation.status]);

  const handleParticipantsChange = (updated: Participant[]) => {
    onParticipantsChange(updated);
    setEventRefreshKey(key => key + 1);
  };

  const [launchOpen, setLaunchOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [launchError, setLaunchError] = useState('');
  const [preparingLaunch, setPreparingLaunch] = useState(false);
  const isOrganizer = currentUser.role === 'organizer';
  const status = operation.status;

  const changeStatus = async (newStatus: Operation['status']) => {
    setStatusError('');
    try {
      await onStatusChange(operation.id, newStatus);
      await reloadPlanning();
      setEventRefreshKey(key => key + 1);
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : 'Не удалось изменить статус');
    }
  };

  const handlePrepareLaunch = async () => {
    setLaunchError('');
    setPreparingLaunch(true);
    try {
      const updated = await beginLaunch(operation.id);
      onOperationUpdate(updated);
      setEventRefreshKey(key => key + 1);
      setLaunchOpen(true);
    } catch (err) {
      setLaunchError(err instanceof ApiError ? err.message : 'Не удалось начать подготовку к запуску');
    } finally {
      setPreparingLaunch(false);
    }
  };

  if (launchOpen) {
    return (
      <LaunchOperation
        operation={operation}
        canLaunchOperation={canLaunchOperation}
        canConfirmPasiv={canConfirmPasiv}
        onOperationUpdate={(op) => {
          onOperationUpdate(op);
          setEventRefreshKey(key => key + 1);
        }}
        onCancel={() => setLaunchOpen(false)}
      />
    );
  }

  const planningProgress = planningState
    ? [planningState.architectureFixed, planningState.sedationFixed, planningState.scenariosFixed].filter(Boolean).length
    : 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {operation.name || 'Без названия'}
          </Typography>

          {canStartPlanning && isOrganizer && status === 'active' && (
            <Tooltip title="Перевести операцию в режим планирования">
              <Button
                color="inherit" variant="outlined" size="small"
                startIcon={<PlayArrow />} sx={{ mr: 2, borderColor: 'rgba(255,255,255,0.5)' }}
                onClick={() => changeStatus('planning')}
              >
                Начать планирование
              </Button>
            </Tooltip>
          )}
          {canFinalizeOperation && isOrganizer && status === 'planning' && (
            <Tooltip title={
              planningState?.canFinalize
                ? 'Зафиксировать операцию и перевести в «Готова к запуску»'
                : 'Зафиксируйте архитектуру, седацию и сценарии'
            }>
              <span>
                <Button
                  color="inherit" variant="outlined" size="small"
                  startIcon={<Lock />} sx={{ mr: 2, borderColor: 'rgba(255,255,255,0.5)' }}
                  onClick={() => changeStatus('ready')}
                  disabled={!planningState?.canFinalize}
                >
                  Зафиксировать операцию
                </Button>
              </span>
            </Tooltip>
          )}
          {canLaunchOperation && isOrganizer && status === 'ready' && (
            <Tooltip title="Начать подготовку к запуску операции">
              <span>
                <Button
                  color="inherit" variant="outlined" size="small"
                  startIcon={<RocketLaunch />} sx={{ mr: 2, borderColor: 'rgba(255,255,255,0.5)' }}
                  onClick={handlePrepareLaunch}
                  disabled={preparingLaunch}
                >
                  {preparingLaunch ? 'Подготовка…' : 'Подготовить к запуску'}
                </Button>
              </span>
            </Tooltip>
          )}
          {canLaunchOperation && isOrganizer && status === 'launch' && (
            <Tooltip title="Открыть интерфейс запуска операции">
              <Button
                color="inherit" variant="outlined" size="small"
                startIcon={<RocketLaunch />} sx={{ mr: 2, borderColor: 'rgba(255,255,255,0.5)' }}
                onClick={() => setLaunchOpen(true)}
              >
                Процесс запуска
              </Button>
            </Tooltip>
          )}
          {canConfirmPasiv && status === 'launch' && (
            <Tooltip title="Подключить участников к PASIV и подтвердить готовность к седации">
              <Button
                color="inherit" variant="outlined" size="small"
                startIcon={<Science />} sx={{ mr: 2, borderColor: 'rgba(255,255,255,0.5)' }}
                onClick={() => setLaunchOpen(true)}
              >
                Подключение PASIV
              </Button>
            </Tooltip>
          )}
          {(canLaunchOperation || canConfirmPasiv) && status === 'running' && (
            <Tooltip title="Мониторинг запущенной операции">
              <Button
                color="inherit" variant="outlined" size="small"
                startIcon={<RocketLaunch />} sx={{ mr: 2, borderColor: 'rgba(255,255,255,0.5)' }}
                onClick={() => setLaunchOpen(true)}
              >
                Мониторинг PASIV
              </Button>
            </Tooltip>
          )}

          <Chip
            label={STATUS_LABELS[status] ?? status}
            color={STATUS_COLORS[status] ?? 'default'}
            sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', mr: 2 }}
          />
          <Chip
            label={`${currentUser.login}: ${ROLE_LABELS[currentUser.role]}`}
            color="primary" variant="outlined"
            sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {statusError && <Alert severity="error" sx={{ mb: 2 }}>{statusError}</Alert>}
        {launchError && <Alert severity="error" sx={{ mb: 2 }}>{launchError}</Alert>}
        {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

        {status === 'planning' && planningState && (
          <Alert severity="info" sx={{ mb: 2 }} icon={<CheckCircle />}>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <span>Прогресс планирования: {planningProgress}/3</span>
              <Chip size="small" label="Архитектура" color={planningState.architectureFixed ? 'success' : 'default'} />
              <Chip size="small" label="Седация" color={planningState.sedationFixed ? 'success' : 'default'} />
              <Chip size="small" label="Сценарии" color={planningState.scenariosFixed ? 'success' : 'default'} />
            </Stack>
          </Alert>
        )}

        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
          {isOrganizer && <Tab label="Редактирование" />}
          <Tab label="Участники" />
          <Tab label="Архитектура сна" />
          <Tab label="Седация" />
          <Tab label="Сценарии" />
          <Tab label="Журнал событий" />
        </Tabs>

        {(() => {
          const offset = isOrganizer ? 0 : -1;
          const tab = activeTab;

          if (isOrganizer && tab === 0) return (
            <OperationEditor
              operation={operation}
              onSave={async (op) => {
                setSaveError('');
                setSaving(true);
                try {
                  await onSave(op);
                } catch (err) {
                  setSaveError(err instanceof ApiError ? err.message : 'Не удалось сохранить операцию');
                } finally {
                  setSaving(false);
                }
              }}
              onCancel={onClose}
              hideTitle
              saving={saving}
            />
          );
          if (tab === 1 + offset) return (
            <Participants
              operationId={operation.id}
              participants={participants}
              onParticipantsChange={handleParticipantsChange}
              canManage={canManageParticipants}
            />
          );
          if (tab === 2 + offset) return (
            <DreamArchitecture
              operationId={operation.id}
              operationStatus={status}
              participants={participants}
              canEdit={planningState?.canEditArchitecture ?? false}
              architectureFixed={planningState?.architectureFixed ?? false}
              isOrganizer={isOrganizer}
              onPlanningChange={reloadPlanning}
            />
          );
          if (tab === 3 + offset) return (
            <Sedation
              operationId={operation.id}
              operationStatus={status}
              participants={participants}
              canEdit={planningState?.canEditSedation ?? false}
              sedationFixed={planningState?.sedationFixed ?? false}
              architectureFixed={planningState?.architectureFixed ?? false}
              isOrganizer={isOrganizer}
              onPlanningChange={reloadPlanning}
            />
          );
          if (tab === 4 + offset) return (
            <Scenarios
              operationId={operation.id}
              operationStatus={status}
              participants={participants}
              canEdit={planningState?.canEditScenarios ?? false}
              scenariosFixed={planningState?.scenariosFixed ?? false}
              architectureFixed={planningState?.architectureFixed ?? false}
              isOrganizer={isOrganizer}
              onPlanningChange={reloadPlanning}
            />
          );
          if (tab === 5 + offset) return (
            <EventLog operationId={operation.id} refreshKey={eventRefreshKey} />
          );
          return null;
        })()}
      </Container>
    </Box>
  );
}
