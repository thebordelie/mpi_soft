import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Alert, Chip, Paper, Checkbox, ListItemText, OutlinedInput,
  Divider, Stack,
} from '@mui/material';
import {
  Add, Delete, Edit, ArrowDownward, ArrowForward,
  Event as EventIcon, Person, Warning, Lock,
} from '@mui/icons-material';
import { Participant, DreamLevel, KeyEvent } from '../types';
import {
  createDreamLevel,
  deleteDreamLevel,
  fetchDreamLevels,
  fixArchitecture,
  updateDreamLevel,
} from '../api/planning';
import { ApiError } from '../api/client';

interface DreamArchitectureProps {
  operationId: string;
  operationStatus: string;
  participants: Participant[];
  canEdit: boolean;
  architectureFixed: boolean;
  isOrganizer?: boolean;
  onPlanningChange?: () => void;
}

const emptyKeyEvent = (): Omit<KeyEvent, 'id'> => ({
  name: '',
  description: '',
  participantIds: [],
});

const emptyForm = () => ({
  name: '',
  description: '',
  goal: '',
  parentLevelId: null as string | null,
  participantIds: [] as string[],
  keyEvents: [] as (Omit<KeyEvent, 'id'> & { tempId: string })[],
});

export function DreamArchitecture({
  operationId,
  operationStatus,
  participants,
  canEdit,
  architectureFixed,
  isOrganizer = false,
  onPlanningChange,
}: DreamArchitectureProps) {
  const isLocked = operationStatus !== 'planning' || architectureFixed || !canEdit;

  const [levels, setLevels] = useState<DreamLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setLevels(await fetchDreamLevels(operationId));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Не удалось загрузить уровни сна');
    } finally {
      setLoading(false);
    }
  }, [operationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleFixArchitecture = async () => {
    try {
      await fixArchitecture(operationId);
      onPlanningChange?.();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Не удалось зафиксировать архитектуру');
    }
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<DreamLevel | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeConfirmOpen, setActiveConfirmOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<DreamLevel | null>(null);
  const [conflictWarning, setConflictWarning] = useState('');

  const openAdd = () => {
    if (isLocked) { alert('Редактирование недоступно'); return; }
    setEditingLevel(null);
    setForm(emptyForm());
    setErrors({});
    setConflictWarning('');
    setDialogOpen(true);
  };

  const openEdit = (level: DreamLevel) => {
    if (isLocked) { alert('Редактирование недоступно'); return; }
    setEditingLevel(level);
    setForm({
      name: level.name,
      description: level.description,
      goal: level.goal,
      parentLevelId: level.parentLevelId,
      participantIds: level.participantIds,
      keyEvents: level.keyEvents.map(e => ({ ...e, tempId: e.id })),
    });
    setErrors({});
    setConflictWarning('');
    setDialogOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Введите название уровня';
    if (!form.description.trim()) e.description = 'Введите описание уровня';
    if (!form.goal.trim()) e.goal = 'Введите цель уровня';
    form.keyEvents.forEach((ke, i) => {
      if (!ke.name.trim()) e[`ke_name_${i}`] = `Ключевое событие ${i + 1}: введите название`;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const checkConflicts = (parentId: string | null): string => {
    if (!parentId) return '';
    const visited = new Set<string>();
    let current: string | null = parentId;
    while (current) {
      if (visited.has(current)) return 'Обнаружен конфликт: циклическая зависимость между уровнями';
      if (editingLevel && current === editingLevel.id) return 'Обнаружен конфликт: уровень не может ссылаться на себя';
      visited.add(current);
      current = levels.find(l => l.id === current)?.parentLevelId ?? null;
    }
    return '';
  };

  const buildLevel = (): DreamLevel => ({
    id: editingLevel?.id ?? Date.now().toString(),
    name: form.name.trim(),
    description: form.description.trim(),
    goal: form.goal.trim(),
    parentLevelId: form.parentLevelId,
    participantIds: form.participantIds,
    keyEvents: form.keyEvents.map((ke, i) => ({
      id: ke.tempId ?? `${Date.now()}_${i}`,
      name: ke.name.trim(),
      description: ke.description.trim(),
      participantIds: ke.participantIds,
    })),
  });

  const commitSave = async (level: DreamLevel) => {
    setSaving(true);
    try {
      if (editingLevel) {
        await updateDreamLevel(operationId, editingLevel.id, level);
      } else {
        await createDreamLevel(operationId, level);
      }
      await reload();
      setDialogOpen(false);
      setPendingSave(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Не удалось сохранить уровень');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!validate()) return;

    const conflict = checkConflicts(form.parentLevelId);
    if (conflict) { setConflictWarning(conflict); return; }

    const level = buildLevel();
    commitSave(level);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить уровень сна?')) return;
    try {
      await deleteDreamLevel(operationId, id);
      await reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Не удалось удалить уровень');
    }
  };

  const addKeyEvent = () => {
    setForm(prev => ({
      ...prev,
      keyEvents: [...prev.keyEvents, { ...emptyKeyEvent(), tempId: Date.now().toString() }],
    }));
  };

  const updateKeyEvent = (index: number, field: keyof Omit<KeyEvent, 'id'>, value: string | string[]) => {
    setForm(prev => {
      const kEvents = [...prev.keyEvents];
      kEvents[index] = { ...kEvents[index], [field]: value };
      return { ...prev, keyEvents: kEvents };
    });
    const key = `ke_name_${index}`;
    if (errors[key]) setErrors(er => { const u = { ...er }; delete u[key]; return u; });
  };

  const removeKeyEvent = (index: number) => {
    setForm(prev => ({ ...prev, keyEvents: prev.keyEvents.filter((_, i) => i !== index) }));
  };

  const getParticipantName = (id: string) => participants.find(p => p.id === id)?.name ?? id;

  const getLevelDisplayName = (level: DreamLevel) => level.name;

  const buildTree = (): DreamLevel[] => {
    const result: DreamLevel[] = [];
    const roots = levels.filter(l => !l.parentLevelId);
    const addChildren = (parentId: string) => {
      levels.filter(l => l.parentLevelId === parentId).forEach(child => {
        result.push(child);
        addChildren(child.id);
      });
    };
    roots.forEach(root => { result.push(root); addChildren(root.id); });
    levels.filter(l => !result.find(r => r.id === l.id)).forEach(l => result.push(l));
    return result;
  };

  const orderedLevels = buildTree();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Архитектура сна</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!isLocked && levels.length > 0 && !architectureFixed && (
            <Button variant="outlined" startIcon={<Lock />} onClick={handleFixArchitecture} color="success">
              Зафиксировать архитектуру сна
            </Button>
          )}
          {architectureFixed && (
            <Chip label="Архитектура зафиксирована" color="success" icon={<Lock />} />
          )}
          {!isLocked && (
            <Button variant="contained" startIcon={<Add />} onClick={openAdd}>
              Добавить уровень
            </Button>
          )}
        </Box>
      </Box>

      {isLocked && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<Warning />}>
          Операция не в статусе «Планирование» или архитектура зафиксирована — редактирование недоступно.
        </Alert>
      )}

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      {loading ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>Загрузка…</Typography>
      ) : levels.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">
              {isOrganizer
                ? 'Архитектор ещё не добавил уровни.'
                : 'Уровни сна не добавлены. Нажмите «Добавить уровень» для начала.'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {orderedLevels.map((level, index) => {
            const parent = levels.find(l => l.id === level.parentLevelId);
            const levelParticipants = participants.filter(p => level.participantIds.includes(p.id));
            return (
              <Box key={level.id}>
                {parent && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 3, mb: 1, color: 'text.secondary' }}>
                    <ArrowDownward fontSize="small" />
                    <Typography variant="caption">подуровень от «{getLevelDisplayName(parent)}»</Typography>
                  </Box>
                )}
                {!parent && index > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                    <ArrowDownward color="primary" sx={{ fontSize: 32 }} />
                  </Box>
                )}
                <Paper
                  elevation={2}
                  sx={{
                    p: 3, mb: 2,
                    borderLeft: '4px solid',
                    borderColor: parent ? 'secondary.main' : 'primary.main',
                    ml: parent ? 4 : 0,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>{level.name}</Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {level.description}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Цель:</strong> {level.goal}
                      </Typography>

                      {levelParticipants.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                          {levelParticipants.map(p => (
                            <Chip key={p.id} icon={<Person sx={{ fontSize: 14 }} />} label={p.name} size="small" variant="outlined" />
                          ))}
                        </Box>
                      )}

                      {level.keyEvents.length > 0 && (
                        <Box sx={{ mt: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <EventIcon sx={{ fontSize: 14 }} /> Ключевые события ({level.keyEvents.length})
                          </Typography>
                          <Stack spacing={0.5}>
                            {level.keyEvents.map(ke => (
                              <Box key={ke.id} sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
                                <Typography variant="body2"><strong>{ke.name}</strong></Typography>
                                {ke.description && (
                                  <Typography variant="caption" color="text.secondary">{ke.description}</Typography>
                                )}
                                {ke.participantIds.length > 0 && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {ke.participantIds.map(id => getParticipantName(id)).join(', ')}
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ ml: 2, display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => openEdit(level)} title="Редактировать"><Edit /></IconButton>
                      <IconButton size="small" onClick={() => handleDelete(level.id)} title="Удалить"><Delete /></IconButton>
                    </Box>
                  </Box>
                </Paper>
              </Box>
            );
          })}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle>{editingLevel ? 'Редактировать уровень' : 'Добавить уровень сна'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            {conflictWarning && (
              <Alert severity="error" onClose={() => setConflictWarning('')}>{conflictWarning}</Alert>
            )}

            {Object.keys(errors).length > 0 && (
              <Alert severity="error">
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Заполните обязательные поля:</Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {Object.values(errors).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </Alert>
            )}

            <TextField
              label="Название уровня" value={form.name} required
              onChange={(e) => { setForm(p => ({ ...p, name: e.target.value })); if (errors.name) setErrors(er => { const u = { ...er }; delete u.name; return u; }); }}
              error={!!errors.name} helperText={errors.name} fullWidth
            />
            <TextField
              label="Описание уровня" value={form.description} required multiline rows={3}
              onChange={(e) => { setForm(p => ({ ...p, description: e.target.value })); if (errors.description) setErrors(er => { const u = { ...er }; delete u.description; return u; }); }}
              error={!!errors.description} helperText={errors.description} fullWidth
            />
            <TextField
              label="Цель уровня" value={form.goal} required multiline rows={2}
              onChange={(e) => { setForm(p => ({ ...p, goal: e.target.value })); if (errors.goal) setErrors(er => { const u = { ...er }; delete u.goal; return u; }); }}
              error={!!errors.goal} helperText={errors.goal} fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Подключить к уровню</InputLabel>
              <Select
                value={form.parentLevelId ?? ''}
                label="Подключить к уровню"
                onChange={(e) => {
                  const val = e.target.value;
                  setForm(p => ({ ...p, parentLevelId: val || null }));
                  setConflictWarning('');
                }}
              >
                <MenuItem value="">— Корневой уровень (без родителя)</MenuItem>
                {levels
                  .filter(l => !editingLevel || l.id !== editingLevel.id)
                  .map(l => (
                    <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Участники уровня</InputLabel>
              <Select
                multiple
                value={form.participantIds}
                onChange={(e) => setForm(p => ({ ...p, participantIds: e.target.value as string[] }))}
                input={<OutlinedInput label="Участники уровня" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map(id => (
                      <Chip key={id} label={getParticipantName(id)} size="small" />
                    ))}
                  </Box>
                )}
              >
                {participants.length === 0 ? (
                  <MenuItem disabled>Сначала добавьте участников во вкладке «Участники»</MenuItem>
                ) : participants.map(p => (
                  <MenuItem key={p.id} value={p.id}>
                    <Checkbox checked={form.participantIds.includes(p.id)} />
                    <ListItemText primary={p.name} secondary={`@${p.login}`} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Ключевые события
                </Typography>
                <Button size="small" startIcon={<Add />} onClick={addKeyEvent}>
                  Добавить событие
                </Button>
              </Box>

              {form.keyEvents.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Ключевые события не добавлены</Typography>
              ) : (
                <Stack spacing={2}>
                  {form.keyEvents.map((ke, i) => (
                    <Paper key={ke.tempId} variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Событие {i + 1}</Typography>
                        <IconButton size="small" onClick={() => removeKeyEvent(i)}><Delete fontSize="small" /></IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <TextField
                          label="Название события" value={ke.name} size="small" fullWidth required
                          onChange={(e) => updateKeyEvent(i, 'name', e.target.value)}
                          error={!!errors[`ke_name_${i}`]} helperText={errors[`ke_name_${i}`]}
                        />
                        <TextField
                          label="Описание события" value={ke.description} size="small" fullWidth multiline rows={2}
                          onChange={(e) => updateKeyEvent(i, 'description', e.target.value)}
                        />
                        <FormControl fullWidth size="small">
                          <InputLabel>Участники события</InputLabel>
                          <Select
                            multiple
                            value={ke.participantIds}
                            onChange={(e) => updateKeyEvent(i, 'participantIds', e.target.value as string[])}
                            input={<OutlinedInput label="Участники события" />}
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
                                <Checkbox checked={ke.participantIds.includes(p.id)} />
                                <ListItemText primary={p.name} />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSave} variant="contained" startIcon={editingLevel ? undefined : <Add />}>
            {editingLevel ? 'Сохранить' : 'Добавить уровень'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={activeConfirmOpen} onClose={() => setActiveConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Требуется подтверждение</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Операция находится в статусе <strong>В работе</strong>. Изменение архитектуры сна требует подтверждения Организатора.
          </Alert>
          <Typography variant="body2">Подтвердить изменение?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setActiveConfirmOpen(false); setPendingSave(null); }}>Отмена</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => { if (pendingSave) commitSave(pendingSave); setActiveConfirmOpen(false); setDialogOpen(false); }}
          >
            Подтвердить (Организатор)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
