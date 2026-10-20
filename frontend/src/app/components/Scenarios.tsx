import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Chip, Accordion, AccordionSummary,
  AccordionDetails, FormControl, InputLabel, Select, MenuItem,
  Checkbox, ListItemText, OutlinedInput, Stack,
} from '@mui/material';
import { Add, Delete, Edit, ExpandMore, Warning, Lock } from '@mui/icons-material';
import { Participant, DreamLevel } from '../types';
import {
  createScenario,
  deleteScenario,
  fetchDreamLevels,
  fetchScenarios,
  fixScenarios,
  updateScenario,
  type ScenarioDto,
} from '../api/planning';
import { ApiError } from '../api/client';

interface Scenario {
  id: string;
  name: string;
  levelId: string;
  participantIds: string[];
  description: string;
  trigger: string;
  expectedResult: string;
}

function dtoToScenario(dto: ScenarioDto): Scenario {
  return {
    id: dto.id,
    name: dto.name,
    levelId: dto.levelId,
    participantIds: dto.participantIds,
    description: dto.description,
    trigger: dto.trigger,
    expectedResult: dto.expectedResult,
  };
}

function scenarioToPayload(scenario: Omit<Scenario, 'id'>): Omit<ScenarioDto, 'id'> {
  return {
    name: scenario.name,
    levelId: scenario.levelId,
    participantIds: scenario.participantIds,
    description: scenario.description,
    trigger: scenario.trigger,
    expectedResult: scenario.expectedResult,
  };
}

interface ScenariosProps {
  operationId: string;
  operationStatus: string;
  participants: Participant[];
  canEdit: boolean;
  scenariosFixed: boolean;
  architectureFixed: boolean;
  isOrganizer?: boolean;
  onPlanningChange?: () => void;
}

const emptyForm = () => ({
  name: '',
  levelId: '',
  participantIds: [] as string[],
  description: '',
  trigger: '',
  expectedResult: '',
});

export function Scenarios({
  operationId,
  operationStatus,
  participants,
  canEdit,
  scenariosFixed,
  architectureFixed,
  isOrganizer = false,
  onPlanningChange,
}: ScenariosProps) {
  const isLocked = operationStatus !== 'planning' || scenariosFixed || !canEdit;

  const [dreamLevels, setDreamLevels] = useState<DreamLevel[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [levels, dtos] = await Promise.all([
        fetchDreamLevels(operationId),
        fetchScenarios(operationId),
      ]);
      setDreamLevels(levels);
      setScenarios(dtos.map(dtoToScenario));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [operationId]);

  useEffect(() => { reload(); }, [reload]);

  const handleFixScenarios = async () => {
    try {
      await fixScenarios(operationId);
      onPlanningChange?.();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Не удалось зафиксировать сценарии');
    }
  };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeConfirmOpen, setActiveConfirmOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<Scenario | null>(null);

  const openAdd = () => {
    if (isLocked) { alert('Редактирование недоступно'); return; }
    setEditingScenario(null);
    setForm(emptyForm());
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (scenario: Scenario) => {
    if (isLocked) { alert('Редактирование недоступно'); return; }
    setEditingScenario(scenario);
    setForm({
      name: scenario.name,
      levelId: scenario.levelId,
      participantIds: scenario.participantIds,
      description: scenario.description,
      trigger: scenario.trigger,
      expectedResult: scenario.expectedResult,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Введите название сценария';
    if (!form.levelId) e.levelId = 'Выберите уровень сна';
    if (!form.description.trim()) e.description = 'Введите описание сценария';
    if (!form.trigger.trim()) e.trigger = 'Введите триггер сценария';
    if (!form.expectedResult.trim()) e.expectedResult = 'Введите ожидаемый результат';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildScenario = (): Scenario => ({
    id: editingScenario?.id ?? Date.now().toString(),
    name: form.name.trim(),
    levelId: form.levelId,
    participantIds: form.participantIds,
    description: form.description.trim(),
    trigger: form.trigger.trim(),
    expectedResult: form.expectedResult.trim(),
  });

  const commitSave = async (scenario: Scenario) => {
    try {
      if (editingScenario) {
        await updateScenario(operationId, editingScenario.id, scenarioToPayload(scenario));
      } else {
        await createScenario(operationId, scenarioToPayload(scenario));
      }
      await reload();
      setDialogOpen(false);
      setPendingSave(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Не удалось сохранить сценарий');
    }
  };

  const handleSave = () => {
    if (!validate()) return;
    commitSave(buildScenario());
  };

  const handleDelete = async (id: string) => {
    if (isLocked) { alert('Редактирование недоступно'); return; }
    if (!confirm('Удалить сценарий?')) return;
    try {
      await deleteScenario(operationId, id);
      await reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Не удалось удалить');
    }
  };

  const getLevelName = (levelId: string) => dreamLevels.find(l => l.id === levelId)?.name ?? `Уровень (${levelId})`;
  const getParticipantName = (id: string) => participants.find(p => p.id === id)?.name ?? id;

  const f = (field: string, val: string | string[]) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(er => { const u = { ...er }; delete u[field]; return u; });
  };

  const grouped = scenarios.reduce((acc, s) => {
    const key = s.levelId || 'no_level';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {} as Record<string, Scenario[]>);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Сценарии взаимодействия</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {scenarios.length > 0 && !scenariosFixed && !isLocked && (
            <Button variant="outlined" color="success" startIcon={<Lock />} onClick={handleFixScenarios}
              disabled={!architectureFixed}>
              Зафиксировать сценарии
            </Button>
          )}
          {scenariosFixed && (
            <Chip label="Сценарии зафиксированы" color="success" />
          )}
          {!isLocked && (
          <Button variant="contained" startIcon={<Add />} onClick={openAdd}
            disabled={!architectureFixed || dreamLevels.length === 0}>
            Добавить сценарий
          </Button>
          )}
        </Box>
      </Box>

      {!architectureFixed && (
        <Alert severity="info" sx={{ mb: 2 }}>Сначала должна быть зафиксирована архитектура сна.</Alert>
      )}

      {loading ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>Загрузка…</Typography>
      ) : scenarios.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">
              {isOrganizer
                ? 'Имперсонатор ещё не добавил сценарии.'
                : 'Сценарии не добавлены. Нажмите «Добавить сценарий» для начала.'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        Object.keys(grouped).map(levelId => (
          <Box key={levelId} sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              {levelId === 'no_level' ? 'Без уровня' : getLevelName(levelId)}
            </Typography>
            <Stack spacing={1}>
              {grouped[levelId].map(scenario => (
                <Accordion key={scenario.id} variant="outlined">
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 1, alignItems: 'center' }}>
                      <Typography sx={{ fontWeight: 500 }}>{scenario.name}</Typography>
                      <Box onClick={e => e.stopPropagation()}>
                        <IconButton size="small" onClick={() => openEdit(scenario)}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => handleDelete(scenario.id)}><Delete fontSize="small" /></IconButton>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1.5}>
                      {scenario.participantIds.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Участники</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {scenario.participantIds.map(id => (
                              <Chip key={id} label={getParticipantName(id)} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      )}
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Описание</Typography>
                        <Typography variant="body2">{scenario.description}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Триггер</Typography>
                        <Typography variant="body2">{scenario.trigger}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Ожидаемый результат</Typography>
                        <Typography variant="body2">{scenario.expectedResult}</Typography>
                      </Box>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </Box>
        ))
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle>{editingScenario ? 'Редактировать сценарий' : 'Добавить сценарий'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            {Object.keys(errors).length > 0 && (
              <Alert severity="error">
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Заполните обязательные поля:</Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {Object.values(errors).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </Alert>
            )}

            <TextField
              label="Название сценария" value={form.name} required fullWidth
              onChange={(e) => f('name', e.target.value)}
              error={!!errors.name} helperText={errors.name}
            />

            <FormControl fullWidth required error={!!errors.levelId}>
              <InputLabel>Уровень сна</InputLabel>
              <Select
                value={form.levelId}
                label="Уровень сна"
                onChange={(e) => f('levelId', e.target.value)}
              >
                {dreamLevels.length === 0 ? (
                  <MenuItem disabled>Сначала добавьте уровни во вкладке «Архитектура сна»</MenuItem>
                ) : dreamLevels.map(l => (
                  <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
                ))}
              </Select>
              {errors.levelId && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>{errors.levelId}</Typography>
              )}
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Участники сценария</InputLabel>
              <Select
                multiple
                value={form.participantIds}
                onChange={(e) => f('participantIds', e.target.value as string[])}
                input={<OutlinedInput label="Участники сценария" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map(id => (
                      <Chip key={id} label={getParticipantName(id)} size="small" />
                    ))}
                  </Box>
                )}
              >
                {participants.length === 0 ? (
                  <MenuItem disabled>Нет участников</MenuItem>
                ) : participants.map(p => (
                  <MenuItem key={p.id} value={p.id}>
                    <Checkbox checked={form.participantIds.includes(p.id)} />
                    <ListItemText primary={p.name} secondary={`@${p.login}`} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Описание" value={form.description} required fullWidth multiline rows={4}
              onChange={(e) => f('description', e.target.value)}
              error={!!errors.description} helperText={errors.description}
            />

            <TextField
              label="Триггер (условие запуска)" value={form.trigger} required fullWidth multiline rows={2}
              onChange={(e) => f('trigger', e.target.value)}
              error={!!errors.trigger} helperText={errors.trigger}
            />

            <TextField
              label="Ожидаемый результат" value={form.expectedResult} required fullWidth multiline rows={2}
              onChange={(e) => f('expectedResult', e.target.value)}
              error={!!errors.expectedResult} helperText={errors.expectedResult}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSave} variant="contained" startIcon={editingScenario ? undefined : <Add />}>
            {editingScenario ? 'Сохранить' : 'Добавить сценарий'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={activeConfirmOpen} onClose={() => setActiveConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Требуется подтверждение</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Операция находится в статусе <strong>В работе</strong>. Изменение сценариев требует подтверждения Организатора.
          </Alert>
          <Typography variant="body2">Подтвердить изменение?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setActiveConfirmOpen(false); setPendingSave(null); }}>Отмена</Button>
          <Button
            variant="contained" color="warning"
            onClick={() => { if (pendingSave) commitSave(pendingSave); setActiveConfirmOpen(false); setDialogOpen(false); }}
          >
            Подтвердить (Организатор)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
