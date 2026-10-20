import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Chip, FormControl, InputLabel, Select,
  MenuItem, Grid, Stack, Divider, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Paper,
} from '@mui/material';
import { Add, Delete, Edit, Science, Timer, Warning, CheckCircle } from '@mui/icons-material';
import { Participant } from '../types';
import {
  createSedationConfig,
  deleteSedationConfig,
  fetchDreamLevels,
  fetchSedationConfigs,
  fixSedation,
  updateSedationConfig,
  type SedationConfigDto,
} from '../api/planning';
import { ApiError } from '../api/client';
import type { DreamLevel } from '../types';

const COMPOUNDS = [
  { value: 'somnacin', label: 'Сомнацин (Somnacin)', maxDose: 1000, minDose: 100 },
  { value: 'somnacin_compound', label: 'Сомнацин композит', maxDose: 800, minDose: 200 },
  { value: 'experimental', label: 'Экспериментальный состав', maxDose: 600, minDose: 50 },
];

const METHODS = [
  { value: 'iv', label: 'Внутривенно (IV)' },
  { value: 'im', label: 'Внутримышечно (IM)' },
  { value: 'device', label: 'Через PASIV-устройство' },
];

interface SedationConfig {
  id: string;
  levelId: string;
  participantId: string;
  compound: string;
  dosage: number;
  duration: number;
  method: string;
  notes: string;
}

function dtoToConfig(dto: SedationConfigDto): SedationConfig {
  return {
    id: dto.id,
    levelId: dto.levelId,
    participantId: dto.participantId,
    compound: dto.compound,
    dosage: dto.dosage,
    duration: dto.durationHours,
    method: dto.method,
    notes: dto.notes,
  };
}

function configToPayload(config: SedationConfig): Omit<SedationConfigDto, 'id'> {
  return {
    levelId: config.levelId,
    participantId: config.participantId,
    compound: config.compound,
    dosage: config.dosage,
    durationHours: config.duration,
    method: config.method,
    notes: config.notes,
  };
}

interface SedationProps {
  operationId: string;
  operationStatus: string;
  participants: Participant[];
  canEdit: boolean;
  sedationFixed: boolean;
  architectureFixed: boolean;
  isOrganizer?: boolean;
  onPlanningChange?: () => void;
}

const emptyForm = () => ({
  levelId: '',
  participantId: '',
  compound: 'somnacin',
  dosage: '',
  duration: '',
  method: 'iv',
  notes: '',
});

const calcImmersionTime = (realHours: number, levelIndex: number) => {
  const multiplier = Math.pow(20, levelIndex + 1);
  const hours = realHours * multiplier;
  if (hours >= 8760) return `${(hours / 8760).toFixed(1)} лет`;
  if (hours >= 720) return `${(hours / 720).toFixed(1)} месяцев`;
  if (hours >= 24) return `${(hours / 24).toFixed(1)} дней`;
  return `${hours.toFixed(0)} часов`;
};

export function Sedation({
  operationId,
  operationStatus,
  participants,
  canEdit,
  sedationFixed,
  architectureFixed,
  isOrganizer = false,
  onPlanningChange,
}: SedationProps) {
  const isLocked = operationStatus !== 'planning' || sedationFixed || !canEdit;

  const [dreamLevels, setDreamLevels] = useState<DreamLevel[]>([]);
  const [configs, setConfigs] = useState<SedationConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [levels, dtos] = await Promise.all([
        fetchDreamLevels(operationId),
        fetchSedationConfigs(operationId),
      ]);
      setDreamLevels(levels);
      setConfigs(dtos.map(dtoToConfig));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [operationId]);

  useEffect(() => { reload(); }, [reload]);

  const handleFixSedation = async () => {
    try {
      await fixSedation(operationId);
      onPlanningChange?.();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Не удалось зафиксировать седацию');
    }
  };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SedationConfig | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedResult, setSavedResult] = useState<{ config: SedationConfig; warnings: string[] } | null>(null);

  const openAdd = () => {
    if (isLocked) { alert('Редактирование недоступно'); return; }
    setEditingConfig(null);
    setForm(emptyForm());
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (config: SedationConfig) => {
    if (isLocked) { alert('Редактирование недоступно'); return; }
    setEditingConfig(config);
    setForm({
      levelId: config.levelId,
      participantId: config.participantId,
      compound: config.compound,
      dosage: config.dosage.toString(),
      duration: config.duration.toString(),
      method: config.method,
      notes: config.notes,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.levelId) e.levelId = 'Выберите уровень сна';
    if (!form.participantId) e.participantId = 'Выберите участника';
    if (!form.compound) e.compound = 'Выберите препарат';

    const dosage = parseFloat(form.dosage);
    if (!form.dosage || isNaN(dosage) || dosage <= 0) {
      e.dosage = 'Введите корректную дозировку (положительное число)';
    } else {
      const compound = COMPOUNDS.find(c => c.value === form.compound);
      if (compound) {
        if (dosage < compound.minDose) e.dosage = `Минимальная дозировка для ${compound.label}: ${compound.minDose} мг`;
        if (dosage > compound.maxDose) e.dosage = `Максимальная дозировка для ${compound.label}: ${compound.maxDose} мг`;
      }
    }

    const duration = parseFloat(form.duration);
    if (!form.duration || isNaN(duration) || duration <= 0) {
      e.duration = 'Введите корректную длительность (положительное число)';
    } else if (duration > 24) {
      e.duration = 'Длительность не может превышать 24 часа реального времени';
    }

    if (!form.method) e.method = 'Выберите способ введения';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const checkDesync = (newConfig: SedationConfig): string[] => {
    const warnings: string[] = [];
    const levelConfigs = configs
      .filter(c => c.levelId === newConfig.levelId && c.id !== newConfig.id);

    if (levelConfigs.length > 0) {
      const durations = new Set(levelConfigs.map(c => c.duration));
      durations.add(newConfig.duration);
      if (durations.size > 1) {
        warnings.push('Риск рассинхронизации: участники уровня имеют разную длительность седации. Рекомендуется выровнять параметры.');
      }
      const maxDuration = Math.max(...levelConfigs.map(c => c.duration));
      if (Math.abs(newConfig.duration - maxDuration) > 2) {
        warnings.push(`Значительное расхождение длительности (${Math.abs(newConfig.duration - maxDuration)} ч) может привести к преждевременному пробуждению.`);
      }
    }

    const levelIndex = dreamLevels.findIndex(l => l.id === newConfig.levelId);
    if (levelIndex >= 2 && newConfig.compound === 'somnacin') {
      warnings.push('Для уровня 3+ рекомендуется использовать Сомнацин композит или экспериментальный состав.');
    }

    return warnings;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const config: SedationConfig = {
      id: editingConfig?.id ?? '',
      levelId: form.levelId,
      participantId: form.participantId,
      compound: form.compound,
      dosage: parseFloat(form.dosage),
      duration: parseFloat(form.duration),
      method: form.method,
      notes: form.notes.trim(),
    };

    const warnings = checkDesync(config);

    try {
      if (editingConfig) {
        await updateSedationConfig(operationId, editingConfig.id, configToPayload(config));
      } else {
        await createSedationConfig(operationId, configToPayload(config));
      }
      await reload();
      setSavedResult({ config, warnings });
      setDialogOpen(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Не удалось сохранить конфигурацию');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить конфигурацию седации?')) return;
    try {
      await deleteSedationConfig(operationId, id);
      await reload();
      setSavedResult(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Не удалось удалить');
    }
  };

  const getLevelName = (levelId: string) => dreamLevels.find(l => l.id === levelId)?.name ?? `Уровень (${levelId})`;
  const getLevelIndex = (levelId: string) => dreamLevels.findIndex(l => l.id === levelId);
  const getParticipantName = (id: string) => participants.find(p => p.id === id)?.name ?? id;
  const getCompoundLabel = (val: string) => COMPOUNDS.find(c => c.value === val)?.label ?? val;
  const getMethodLabel = (val: string) => METHODS.find(m => m.value === val)?.label ?? val;

  const f = (field: string, val: string) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(er => { const u = { ...er }; delete u[field]; return u; });
  };

  const grouped = configs.reduce((acc, c) => {
    if (!acc[c.levelId]) acc[c.levelId] = [];
    acc[c.levelId].push(c);
    return acc;
  }, {} as Record<string, SedationConfig[]>);

  const currentCompound = COMPOUNDS.find(c => c.value === form.compound);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Седация</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {configs.length > 0 && !sedationFixed && !isLocked && (
            <Button variant="outlined" color="success" startIcon={<Science />} onClick={handleFixSedation}
              disabled={!architectureFixed}>
              Зафиксировать параметры седации
            </Button>
          )}
          {sedationFixed && (
            <Chip label="Параметры зафиксированы" color="success" icon={<Science />} />
          )}
          {!isLocked && (
          <Button variant="contained" startIcon={<Add />} onClick={openAdd} disabled={!architectureFixed || dreamLevels.length === 0}>
            Настроить седацию
          </Button>
          )}
        </Box>
      </Box>

      {savedResult && (
        <Card variant="outlined" sx={{ mb: 3, borderColor: savedResult.warnings.length > 0 ? 'warning.main' : 'success.main' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              {savedResult.warnings.length > 0
                ? <Warning color="warning" />
                : <CheckCircle color="success" />
              }
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Конфигурация сохранена: {getParticipantName(savedResult.config.participantId)}
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    <strong>Уровень:</strong> {getLevelName(savedResult.config.levelId)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Препарат:</strong> {getCompoundLabel(savedResult.config.compound)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Дозировка:</strong> {savedResult.config.dosage} мг
                  </Typography>
                  <Typography variant="body2">
                    <strong>Длительность:</strong> {savedResult.config.duration} ч реального времени
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Timer fontSize="small" color="primary" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Расчётное время погружения:</Typography>
                </Box>
                <Typography variant="h6" color="primary">
                  {calcImmersionTime(savedResult.config.duration, getLevelIndex(savedResult.config.levelId))}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  на уровне «{getLevelName(savedResult.config.levelId)}»
                </Typography>
              </Grid>
            </Grid>

            {savedResult.warnings.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {savedResult.warnings.map((w, i) => (
                  <Alert key={i} severity="warning" sx={{ mb: 1 }}>{w}</Alert>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {!architectureFixed && (
        <Alert severity="info" sx={{ mb: 2 }}>Сначала должна быть зафиксирована архитектура сна.</Alert>
      )}

      {loading ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>Загрузка…</Typography>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Science sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {isOrganizer
                ? 'Химик ещё не добавил параметры седации.'
                : 'Конфигурации седации не добавлены. Нажмите «Настроить седацию» для начала.'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        Object.keys(grouped).map(levelId => (
          <Box key={levelId} sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              {getLevelName(levelId)}
              <Chip
                label={`x${Math.pow(20, getLevelIndex(levelId) + 1)} к времени`}
                size="small" color="primary" variant="outlined" sx={{ ml: 1 }}
              />
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Участник</TableCell>
                    <TableCell>Препарат</TableCell>
                    <TableCell>Дозировка</TableCell>
                    <TableCell>Длительность</TableCell>
                    <TableCell>Способ введения</TableCell>
                    <TableCell>Время в сне</TableCell>
                    <TableCell align="right">Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {grouped[levelId].map(config => (
                    <TableRow key={config.id}>
                      <TableCell>{getParticipantName(config.participantId)}</TableCell>
                      <TableCell>{getCompoundLabel(config.compound)}</TableCell>
                      <TableCell>{config.dosage} мг</TableCell>
                      <TableCell>{config.duration} ч</TableCell>
                      <TableCell>{getMethodLabel(config.method)}</TableCell>
                      <TableCell>
                        <Chip
                          label={calcImmersionTime(config.duration, getLevelIndex(levelId))}
                          size="small" color="primary"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEdit(config)}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => handleDelete(config.id)}><Delete fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle>{editingConfig ? 'Редактировать седацию' : 'Настроить седацию'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            {Object.keys(errors).length > 0 && (
              <Alert severity="error">
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Некорректные параметры:</Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {Object.values(errors).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </Alert>
            )}

            <FormControl fullWidth required error={!!errors.levelId}>
              <InputLabel>Уровень сна</InputLabel>
              <Select value={form.levelId} label="Уровень сна" onChange={(e) => f('levelId', e.target.value)}>
                {dreamLevels.length === 0
                  ? <MenuItem disabled>Сначала добавьте уровни во вкладке «Архитектура сна»</MenuItem>
                  : dreamLevels.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)
                }
              </Select>
              {errors.levelId && <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>{errors.levelId}</Typography>}
            </FormControl>

            <FormControl fullWidth required error={!!errors.participantId}>
              <InputLabel>Участник</InputLabel>
              <Select value={form.participantId} label="Участник" onChange={(e) => f('participantId', e.target.value)}>
                {participants.length === 0
                  ? <MenuItem disabled>Нет участников операции</MenuItem>
                  : participants.map(p => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>@{p.login}</Typography>
                    </MenuItem>
                  ))
                }
              </Select>
              {errors.participantId && <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>{errors.participantId}</Typography>}
            </FormControl>

            <Divider />

            <FormControl fullWidth required>
              <InputLabel>Препарат</InputLabel>
              <Select value={form.compound} label="Препарат" onChange={(e) => f('compound', e.target.value)}>
                {COMPOUNDS.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </Select>
            </FormControl>

            {currentCompound && (
              <Alert severity="info" icon={<Science fontSize="small" />}>
                Допустимая дозировка: {currentCompound.minDose}–{currentCompound.maxDose} мг
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Дозировка (мг)" value={form.dosage} type="number" fullWidth required
                  onChange={(e) => f('dosage', e.target.value)}
                  error={!!errors.dosage} helperText={errors.dosage}
                  inputProps={{ min: 0, step: 10 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Планируемая длительность (часы)" value={form.duration} type="number" fullWidth required
                  onChange={(e) => f('duration', e.target.value)}
                  error={!!errors.duration} helperText={errors.duration || 'Максимум 24 часа реального времени'}
                  inputProps={{ min: 0.5, max: 24, step: 0.5 }}
                />
              </Grid>
            </Grid>

            {form.duration && form.levelId && !isNaN(parseFloat(form.duration)) && (
              <Alert severity="success" icon={<Timer fontSize="small" />}>
                <strong>Расчётное время погружения:</strong>{' '}
                {calcImmersionTime(parseFloat(form.duration), getLevelIndex(form.levelId))} на уровне «{getLevelName(form.levelId)}»
              </Alert>
            )}

            <FormControl fullWidth required>
              <InputLabel>Способ введения</InputLabel>
              <Select value={form.method} label="Способ введения" onChange={(e) => f('method', e.target.value)}>
                {METHODS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField
              label="Примечания" value={form.notes} fullWidth multiline rows={3}
              onChange={(e) => f('notes', e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSave} variant="contained" startIcon={editingConfig ? undefined : <Add />}>
            {editingConfig ? 'Сохранить' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
