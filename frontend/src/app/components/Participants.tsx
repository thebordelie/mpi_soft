import {
  Box, Typography, Card, CardContent, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, Alert, Chip, CircularProgress,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Add, Delete, Edit } from '@mui/icons-material';
import { Participant, ParticipantRole } from '../types';
import {
  addOperationParticipant,
  deleteOperationParticipant,
  fetchOperationParticipants,
  updateOperationParticipant,
} from '../api/operations';
import { ApiError } from '../api/client';

const ROLES: { value: ParticipantRole; label: string }[] = [
  { value: 'architect', label: 'Архитектор' },
  { value: 'chemist', label: 'Химик' },
  { value: 'impersonator', label: 'Имперсонатор' },
  { value: 'extractor', label: 'Извлекатель' },
];

const getRoleLabel = (role: ParticipantRole) => ROLES.find(r => r.value === role)?.label ?? role;

const getRoleColor = (role: ParticipantRole): 'default' | 'primary' | 'secondary' | 'warning' | 'info' => ({
  architect: 'primary', chemist: 'secondary', impersonator: 'warning', extractor: 'info',
} as const)[role];

type DialogMode = 'add' | 'edit' | 'duplicate';

interface ParticipantsProps {
  operationId: string;
  participants: Participant[];
  onParticipantsChange: (participants: Participant[]) => void;
  canManage: boolean;
}

export function Participants({ operationId, participants, onParticipantsChange, canManage }: ParticipantsProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('add');
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [duplicateParticipant, setDuplicateParticipant] = useState<Participant | null>(null);
  const [formData, setFormData] = useState({ login: '', role: '' as ParticipantRole | '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    fetchOperationParticipants(operationId)
      .then(list => {
        if (!cancelled) onParticipantsChange(list);
      })
      .catch(err => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : 'Не удалось загрузить участников');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [operationId]);

  const openAdd = () => {
    if (!canManage) return;
    setDialogMode('add');
    setEditingParticipant(null);
    setDuplicateParticipant(null);
    setFormData({ login: '', role: '' });
    setErrors({});
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (p: Participant) => {
    if (!canManage) return;
    setDialogMode('edit');
    setEditingParticipant(p);
    setDuplicateParticipant(null);
    setFormData({ login: p.login, role: p.role });
    setErrors({});
    setFormError('');
    setDialogOpen(true);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (dialogMode === 'add' && !formData.login.trim()) newErrors.login = 'Введите логин участника';
    if (!formData.role) newErrors.role = 'Выберите роль участника';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    setFormError('');
    try {
      if (dialogMode === 'add') {
        const added = await addOperationParticipant(operationId, {
          login: formData.login.trim(),
          role: formData.role as ParticipantRole,
        });
        onParticipantsChange([...participants, added]);
        setDialogOpen(false);
      } else {
        const target = editingParticipant ?? duplicateParticipant;
        if (!target) return;
        const updated = await updateOperationParticipant(
          operationId,
          target.id,
          formData.role as ParticipantRole,
        );
        onParticipantsChange(participants.map(p => (p.id === target.id ? updated : p)));
        setDialogOpen(false);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Не удалось сохранить';
      if (dialogMode === 'add' && message.includes('уже добавлен')) {
        const existing = participants.find(
          p => p.login.toLowerCase() === formData.login.trim().toLowerCase(),
        );
        if (existing) {
          setDuplicateParticipant(existing);
          setDialogMode('duplicate');
        } else {
          setFormError(message);
        }
      } else {
        setFormError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage) return;
    if (!confirm('Удалить участника из операции?')) return;

    try {
      await deleteOperationParticipant(operationId, id);
      onParticipantsChange(participants.filter(p => p.id !== id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Не удалось удалить участника');
    }
  };

  const closeDialog = () => { setDialogOpen(false); setErrors({}); setFormError(''); };

  const f = (field: string, val: string) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(er => { const u = { ...er }; delete u[field]; return u; });
    if (formError) setFormError('');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Участники операции</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<Add />} onClick={openAdd}>
            Добавить участника
          </Button>
        )}
      </Box>

      {!canManage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          У вас нет прав для управления участниками операции
        </Alert>
      )}

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Логин</TableCell>
                    <TableCell>ФИО</TableCell>
                    <TableCell>Роль</TableCell>
                    {canManage && <TableCell align="right">Действия</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {participants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 4 : 3} align="center">
                        <Typography color="text.secondary" sx={{ py: 2 }}>Участники не добавлены</Typography>
                      </TableCell>
                    </TableRow>
                  ) : participants.map(p => (
                    <TableRow key={p.id}>
                      <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>@{p.login}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>
                        <Chip label={getRoleLabel(p.role)} color={getRoleColor(p.role)} size="small" />
                      </TableCell>
                      {canManage && (
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => openEdit(p)} title="Изменить роль">
                            <Edit />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(p.id)} title="Удалить">
                            <Delete />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen && dialogMode !== 'duplicate'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogMode === 'add' ? 'Добавить участника' : 'Изменить роль участника'}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mt: 1, mb: 1 }}>{formError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {dialogMode === 'add' && (
              <TextField
                label="Логин участника"
                value={formData.login}
                onChange={(e) => f('login', e.target.value)}
                fullWidth
                required
                error={!!errors.login}
                helperText={errors.login || 'Логин зарегистрированного пользователя'}
                placeholder="например: ivanov"
                autoFocus
              />
            )}
            {dialogMode === 'edit' && editingParticipant && (
              <Typography variant="body2" color="text.secondary">
                @{editingParticipant.login} — {editingParticipant.name}
              </Typography>
            )}
            <FormControl fullWidth error={!!errors.role}>
              <InputLabel id="participant-role-label">Роль</InputLabel>
              <Select
                labelId="participant-role-label"
                value={formData.role}
                label="Роль"
                onChange={(e) => f('role', e.target.value)}
              >
                {ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </Select>
              {errors.role && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                  {errors.role}
                </Typography>
              )}
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Отмена</Button>
          <Button onClick={handleSave} variant="contained" startIcon={<Add />} disabled={saving}>
            {saving ? 'Сохранение…' : dialogMode === 'add' ? 'Добавить участника' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogOpen && dialogMode === 'duplicate'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Участник уже добавлен</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Alert severity="warning" sx={{ mb: 2 }}>
            Пользователь <strong>@{duplicateParticipant?.login}</strong> ({duplicateParticipant?.name}) уже участвует
            в операции с ролью <strong>{duplicateParticipant ? getRoleLabel(duplicateParticipant.role) : ''}</strong>.
          </Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>Вы можете изменить его роль на:</Typography>
          <FormControl fullWidth>
            <InputLabel id="duplicate-role-label">Новая роль</InputLabel>
            <Select
              labelId="duplicate-role-label"
              value={formData.role}
              label="Новая роль"
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as ParticipantRole }))}
            >
              {ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Отмена</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Сохранение…' : 'Изменить роль'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
