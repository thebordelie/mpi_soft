import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Stepper, Step, StepLabel, Alert, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Paper, TextField, LinearProgress, Grid, Divider, Stack, IconButton,
} from '@mui/material';
import {
  Wifi, WifiOff, CheckCircle, PlayArrow, Warning,
  Timer, Science, Layers, Close, Flag,
} from '@mui/icons-material';
import { Operation, DreamLevel } from '../types';
import { fetchDreamLevels } from '../api/planning';
import {
  fetchLaunchState,
  connectPasiv,
  disconnectPasiv,
  advanceLaunchStep,
  confirmSedation,
  rejectSedation,
  executeLaunch,
  completeOperation,
  type LaunchState,
  type PasivConnectionDto,
  type PasivConnectionStatus,
} from '../api/launch';
import { ApiError } from '../api/client';

const ROLE_LABELS: Record<string, string> = {
  architect: 'Архитектор', chemist: 'Химик',
  impersonator: 'Имперсонатор', extractor: 'Извлекатель',
};

interface LaunchOperationProps {
  operation: Operation;
  canLaunchOperation: boolean;
  canConfirmPasiv: boolean;
  onOperationUpdate: (operation: Operation) => void;
  onCancel: () => void;
}

function useElapsedTimer(startIso: string | null, running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running || !startIso) {
      setElapsed(0);
      return;
    }
    const startMs = new Date(startIso).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    ref.current = setInterval(tick, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running, startIso]);

  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function connectionIcon(status: PasivConnectionStatus) {
  if (status === 'connected') return <Wifi color="success" />;
  if (status === 'connecting') return <LinearProgress sx={{ width: 24 }} />;
  return <WifiOff color="error" />;
}

const CONNECTION_LABELS: Record<PasivConnectionStatus, string> = {
  connected: 'Подключён',
  connecting: 'Подключение...',
  disconnected: 'Не подключён',
};

export function LaunchOperation({
  operation,
  canLaunchOperation,
  canConfirmPasiv,
  onOperationUpdate,
  onCancel,
}: LaunchOperationProps) {
  const [dreamLevels, setDreamLevels] = useState<DreamLevel[]>([]);
  const [launchState, setLaunchState] = useState<LaunchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const reload = useCallback(async () => {
    try {
      setLaunchState(await fetchLaunchState(operation.id));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Не удалось загрузить данные запуска');
    } finally {
      setLoading(false);
    }
  }, [operation.id]);

  useEffect(() => {
    fetchDreamLevels(operation.id).then(setDreamLevels).catch(() => setDreamLevels([]));
    reload();
  }, [operation.id, reload]);

  const step = launchState?.currentStep ?? 0;
  const launched = step >= 2;
  const timer = useElapsedTimer(launchState?.launchedAt ?? null, launched);

  const handlePasivToggle = async (conn: PasivConnectionDto) => {
    if (!launchState?.canManagePasiv) return;
    setActionError('');
    setBusyId(conn.participantId);
    try {
      if (conn.connectionStatus === 'connected') {
        await disconnectPasiv(operation.id, conn.participantId);
      } else {
        await connectPasiv(operation.id, conn.participantId);
      }
      await reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Ошибка управления PASIV');
    } finally {
      setBusyId(null);
    }
  };

  const handleAdvanceStep = async () => {
    setActionError('');
    try {
      setLaunchState(await advanceLaunchStep(operation.id));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Не удалось перейти к подтверждению');
    }
  };

  const handleConfirmSedation = async () => {
    setActionError('');
    try {
      setLaunchState(await confirmSedation(operation.id));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Не удалось подтвердить готовность');
    }
  };

  const handleRejectSedation = async () => {
    if (!rejectionReason.trim()) return;
    setActionError('');
    try {
      const updated = await rejectSedation(operation.id, rejectionReason.trim());
      onOperationUpdate(updated);
      setRejectDialogOpen(false);
      onCancel();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Не удалось отклонить готовность');
    }
  };

  const handleConfirmLaunch = async () => {
    setConfirmDialogOpen(false);
    setActionError('');
    try {
      const result = await executeLaunch(operation.id);
      onOperationUpdate(result.operation);
      setLaunchState(result.launch);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Не удалось запустить операцию');
    }
  };

  const handleCompleteOperation = async () => {
    setCompleteDialogOpen(false);
    setActionError('');
    try {
      const result = await completeOperation(operation.id);
      onOperationUpdate(result.operation);
      onCancel();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Не удалось завершить операцию');
    }
  };

  const connections = launchState?.pasivConnections ?? [];
  const sedationSummaries = launchState?.sedationSummaries ?? [];
  const allConnected = launchState?.allConnected ?? false;
  const sedationReadiness = launchState?.sedationReadiness ?? 'pending';

  const getSedationFor = (participantId: string) =>
    sedationSummaries.find(s => s.participantId === participantId);

  const steps = ['Мониторинг PASIV', 'Подтверждение готовности', 'Операция запущена'];

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">Загрузка интерфейса запуска...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ bgcolor: 'primary.dark', color: 'white', px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6">Запуск операции: {operation.name}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Объект: {operation.target.fullName} · Участников: {connections.length}
            {!launched && dreamLevels.length > 0 && ` · Уровней: ${dreamLevels.length}`}
          </Typography>
        </Box>
        {launched && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Timer />
            <Typography variant="h5" sx={{ fontFamily: 'monospace' }}>{timer}</Typography>
          </Box>
        )}
        <IconButton color="inherit" onClick={onCancel}><Close /></IconButton>
      </Box>

      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}

        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {steps.map(label => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {step === 0 && (
          <Box>
            {canLaunchOperation && !launchState?.canManagePasiv && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Химик подключает участников к устройству PASIV. После подтверждения готовности к седации вы сможете запустить операцию.
              </Alert>
            )}
            {canConfirmPasiv && launchState?.canManagePasiv && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Подключите всех участников к PASIV, затем перейдите к подтверждению готовности к седации.
              </Alert>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Подключение к устройству PASIV</Typography>
              {launchState?.canManagePasiv && !allConnected && (
                <Alert severity="warning" sx={{ py: 0 }} icon={<Warning />}>
                  Не все участники подключены
                </Alert>
              )}
              {allConnected && <Alert severity="success" sx={{ py: 0 }}>Все участники подключены</Alert>}
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Участник</TableCell>
                    <TableCell>Роль</TableCell>
                    <TableCell>Статус подключения</TableCell>
                    <TableCell>Параметры седации</TableCell>
                    <TableCell align="center">Управление</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {connections.map(conn => {
                    const sed = getSedationFor(conn.participantId);
                    return (
                      <TableRow key={conn.id}
                        sx={{ bgcolor: conn.connectionStatus === 'connected' ? 'success.50' : undefined }}>
                        <TableCell sx={{ fontWeight: 500 }}>{conn.participantName}</TableCell>
                        <TableCell>
                          <Chip label={ROLE_LABELS[conn.participantRole] ?? conn.participantRole} size="small" />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {connectionIcon(conn.connectionStatus)}
                            <Typography variant="body2">{CONNECTION_LABELS[conn.connectionStatus]}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {conn.sedationActive && sed ? (
                            <Typography variant="caption">
                              {sed.compound} · {sed.dosage} · {sed.durationHours}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {launchState?.canManagePasiv ? (
                            <Button
                              size="small"
                              variant={conn.connectionStatus === 'connected' ? 'outlined' : 'contained'}
                              color={conn.connectionStatus === 'connected' ? 'error' : 'primary'}
                              onClick={() => handlePasivToggle(conn)}
                              disabled={conn.connectionStatus === 'connecting' || busyId === conn.participantId}
                            >
                              {conn.connectionStatus === 'connected' ? 'Отключить' :
                                conn.connectionStatus === 'connecting' ? 'Подключение...' : 'Подключить'}
                            </Button>
                          ) : (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {connections.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary">Участники не добавлены</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
              <Button variant="outlined" onClick={onCancel}>Отмена</Button>
              {launchState?.canAdvanceToConfirm && (
                <Button variant="contained" disabled={!allConnected} onClick={handleAdvanceStep}>
                  Перейти к подтверждению готовности →
                </Button>
              )}
            </Box>
          </Box>
        )}

        {step === 1 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Подтверждение готовности к седации</Typography>

            {canLaunchOperation && sedationReadiness === 'pending' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Ожидается подтверждение готовности к седации от химика. После этого станет доступен запуск операции.
              </Alert>
            )}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Science fontSize="small" /> Сводка по седации
                  </Typography>
                  <Stack spacing={1}>
                    {sedationSummaries.map(sed => (
                      <Box key={sed.participantId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{sed.participantName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {ROLE_LABELS[sed.participantRole] ?? sed.participantRole}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {sed.compound} · {sed.dosage}
                        </Typography>
                      </Box>
                    ))}
                    {sedationSummaries.length === 0 && (
                      <Typography variant="body2" color="text.secondary">Параметры седации не заданы</Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Layers fontSize="small" /> Архитектура сна
                  </Typography>
                  {dreamLevels.length === 0 ? (
                    <Alert severity="warning">Уровни сна не заданы</Alert>
                  ) : dreamLevels.map(l => (
                    <Box key={l.id} sx={{ mb: 0.5 }}>
                      <Typography variant="body2">{l.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{l.goal}</Typography>
                    </Box>
                  ))}
                </Paper>
              </Grid>
            </Grid>

            {sedationReadiness === 'pending' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Химик должен подтвердить готовность к седации перед запуском операции
              </Alert>
            )}
            {sedationReadiness === 'confirmed' && (
              <Alert severity="success" icon={<CheckCircle />} sx={{ mt: 2 }}>
                Готовность к седации подтверждена — можно запускать операцию
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {launchState?.canManagePasiv && (
                  <Button onClick={() => reload()}>← Обновить</Button>
                )}
                {canConfirmPasiv && launchState?.canConfirmSedation && (
                  <Button color="error" variant="outlined"
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={sedationReadiness === 'confirmed'}>
                    Отклонить готовность к седации
                  </Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {canConfirmPasiv && launchState?.canConfirmSedation && (
                  <Button
                    variant="outlined" color="success"
                    startIcon={<Science />}
                    onClick={handleConfirmSedation}
                  >
                    Подтвердить готовность к седации
                  </Button>
                )}
                {canLaunchOperation && launchState?.canLaunch && (
                  <Button
                    variant="contained" color="success"
                    startIcon={<PlayArrow />}
                    onClick={() => setConfirmDialogOpen(true)}
                  >
                    Запустить операцию
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {step >= 2 && (
          <Box>
            <Alert severity="success" icon={<PlayArrow />} sx={{ mb: 3 }}>
              Операция запущена
            </Alert>

            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', maxWidth: 360, mx: 'auto' }}>
              <Timer color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="caption" color="text.secondary" display="block">Общий таймер операции</Typography>
              <Typography variant="h4" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>{timer}</Typography>
            </Paper>

            <Typography variant="h6" sx={{ mt: 3, mb: 1.5 }}>Состояние участников</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Участник</TableCell>
                    <TableCell>Роль</TableCell>
                    <TableCell>PASIV</TableCell>
                    <TableCell>Статус</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {connections.map(conn => (
                    <TableRow key={conn.id}>
                      <TableCell>{conn.participantName}</TableCell>
                      <TableCell><Chip label={ROLE_LABELS[conn.participantRole] ?? conn.participantRole} size="small" /></TableCell>
                      <TableCell>
                        <Chip label="Подключён" color="success" size="small" icon={<Wifi sx={{ fontSize: 14 }} />} />
                      </TableCell>
                      <TableCell><Chip label="Во сне" color="primary" size="small" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
              <Button variant="outlined" onClick={onCancel}>Вернуться к операции</Button>
              {canLaunchOperation && operation.status === 'running' && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Flag />}
                  onClick={() => setCompleteDialogOpen(true)}
                >
                  Завершить операцию
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Box>

      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlayArrow color="success" /> Подтверждение запуска операции
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="caption" color="text.secondary">Название операции</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{operation.name}</Typography>
            </Box>
            <Divider />
            <Box>
              <Typography variant="caption" color="text.secondary">Объект воздействия</Typography>
              <Typography variant="body1">{operation.target.fullName}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Количество участников</Typography>
              <Typography variant="body1">{connections.length} чел.</Typography>
            </Box>
            <Alert severity="warning">
              После подтверждения операция получит статус <strong>Во сне</strong>.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Отменить</Button>
          <Button variant="contained" color="success" startIcon={<PlayArrow />} onClick={handleConfirmLaunch}>
            Подтвердить запуск
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Отклонить готовность к седации</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Операция вернётся на этап планирования. Химик должен скорректировать параметры седации.
          </Alert>
          <TextField label="Причина отклонения" value={rejectionReason} fullWidth multiline rows={3} required
            onChange={e => setRejectionReason(e.target.value)} autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" color="error" onClick={handleRejectSedation}
            disabled={!rejectionReason.trim()}>
            Отклонить и вернуть на планирование
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Flag color="success" /> Завершение операции
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            Операция «{operation.name}» будет переведена в статус <strong>Завершена</strong>. Мониторинг PASIV будет остановлен.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" color="success" startIcon={<Flag />} onClick={handleCompleteOperation}>
            Завершить операцию
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
