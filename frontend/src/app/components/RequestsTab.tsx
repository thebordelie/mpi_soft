import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Chip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Alert, Divider, Grid, IconButton, Collapse, Paper, List,
  ListItem, ListItemText, ListItemSecondaryAction, Badge, CircularProgress,
} from '@mui/material';
import {
  Add, ExpandMore, ExpandLess, CheckCircle, Cancel,
  HourglassEmpty, Description, Edit, Delete, Visibility,
  Group, ArrowForward,
} from '@mui/icons-material';
import { OperationRequest, RequestGoal, RequestStatus, User, Participant, ParticipantRole } from '../types';
import {
  createRequest, updateRequest, submitRequest, rejectRequest, deleteRequest,
  fetchRequests, formToPayload, toOperationRequest,
} from '../api/requests';
import { approveRequest } from '../api/operations';
import { fetchOrganizers, lookupUser } from '../api/users';
import { ApiError } from '../api/client';

const GOALS: { value: RequestGoal; label: string }[] = [
  { value: 'inception', label: 'Внедрение идеи' },
  { value: 'extraction', label: 'Извлечение информации' },
  { value: 'research', label: 'Исследовательская' },
  { value: 'training', label: 'Тренировочная операция' },
];

const PARTICIPANT_ROLES: { value: ParticipantRole; label: string }[] = [
  { value: 'architect', label: 'Архитектор' },
  { value: 'chemist', label: 'Химик' },
  { value: 'impersonator', label: 'Имперсонатор' },
  { value: 'extractor', label: 'Извлекатель' },
];

const STATUS_LABELS: Record<RequestStatus, string> = {
  draft: 'Черновик', pending: 'На рассмотрении',
  approved: 'Одобрена', rejected: 'Отклонена',
};

const STATUS_COLORS: Record<RequestStatus, 'default' | 'warning' | 'success' | 'error'> = {
  draft: 'default', pending: 'warning', approved: 'success', rejected: 'error',
};

const STATUS_ICONS: Record<RequestStatus, React.ReactNode> = {
  draft: <Edit sx={{ fontSize: 16 }} />,
  pending: <HourglassEmpty sx={{ fontSize: 16 }} />,
  approved: <CheckCircle sx={{ fontSize: 16 }} />,
  rejected: <Cancel sx={{ fontSize: 16 }} />,
};

const emptyForm = (): Omit<OperationRequest, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'status'> => ({
  name: '', description: '', plannedDate: '',
  targetFullName: '', targetBirthDate: '', targetDescription: '', targetBehavior: '',
  goal: '', desiredResult: '', successCriteria: '', organization: '', organizerLogin: '',
});

interface ReviewStep { type: 'review' | 'participants' }

interface RequestsTabProps {
  currentUser: User;
  onOperationApproved: () => void;
}

export function RequestsTab({
  currentUser, onOperationApproved,
}: RequestsTabProps) {
  const isCustomer = currentUser.role === 'customer';
  const isOrganizer = currentUser.role === 'organizer';

  const [requests, setRequests] = useState<OperationRequest[]>([]);
  const [organizers, setOrganizers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<OperationRequest | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [reviewRequest, setReviewRequest] = useState<OperationRequest | null>(null);
  const [reviewStep, setReviewStep] = useState<ReviewStep['type']>('review');

  const [tempParticipants, setTempParticipants] = useState<Participant[]>([]);
  const [participantLogin, setParticipantLogin] = useState('');
  const [participantRole, setParticipantRole] = useState<ParticipantRole | ''>('');
  const [participantError, setParticipantError] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const reloadRequests = useCallback(async () => {
    const data = await fetchRequests();
    setRequests(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [reqs, orgs] = await Promise.all([
          fetchRequests(),
          isCustomer ? fetchOrganizers() : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setRequests(reqs);
          setOrganizers(orgs.map(o => ({ login: o.login, fullName: o.fullName, role: 'organizer' })));
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : 'Не удалось загрузить заявки');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isCustomer]);

  const visibleRequests = requests;

  const openCreate = () => {
    setEditingRequest(null); setForm(emptyForm()); setErrors({}); setFormOpen(true);
  };
  const openEdit = (req: OperationRequest) => {
    setEditingRequest(req);
    setForm({ name: req.name, description: req.description, plannedDate: req.plannedDate,
      targetFullName: req.targetFullName, targetBirthDate: req.targetBirthDate,
      targetDescription: req.targetDescription, targetBehavior: req.targetBehavior,
      goal: req.goal, desiredResult: req.desiredResult,
      successCriteria: req.successCriteria, organization: req.organization, organizerLogin: req.organizerLogin });
    setErrors({}); setFormOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Введите название операции';
    if (!form.description.trim()) e.description = 'Введите краткое описание';
    if (!form.plannedDate) e.plannedDate = 'Укажите предполагаемую дату';
    if (!form.targetFullName.trim()) e.targetFullName = 'Введите ФИО объекта';
    if (!form.targetBirthDate) e.targetBirthDate = 'Укажите дату рождения объекта';
    if (!form.targetDescription.trim()) e.targetDescription = 'Введите краткую характеристику объекта';
    if (!form.goal) e.goal = 'Выберите цель операции';
    if (!form.desiredResult.trim()) e.desiredResult = 'Опишите желаемый результат';
    if (!form.successCriteria.trim()) e.successCriteria = 'Укажите критерии успеха';
    if (!form.organization.trim()) e.organization = 'Укажите организацию';
    if (!form.organizerLogin.trim()) e.organizerLogin = 'Укажите логин организатора';
    else if (!organizers.find(o => o.login.toLowerCase() === form.organizerLogin.trim().toLowerCase()))
      e.organizerLogin = 'Организатор с таким логином не найден в системе';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async (asDraft = false) => {
    const payload = formToPayload(form);

    if (asDraft) {
      setSaving(true);
      try {
        if (editingRequest) {
          await updateRequest(editingRequest.id, payload);
        } else {
          const created = await createRequest(payload, false);
          setEditingRequest(created);
        }
        await reloadRequests();
        setFormOpen(false);
      } catch (err) {
        setErrors({ _form: err instanceof ApiError ? err.message : 'Ошибка сохранения' });
      } finally {
        setSaving(false);
      }
      return;
    }

    const valid = validate();
    if (!valid) {
      setSaving(true);
      try {
        if (editingRequest) {
          await updateRequest(editingRequest.id, payload);
        } else {
          const created = await createRequest(payload, false);
          setEditingRequest(created);
        }
        await reloadRequests();
      } catch (err) {
        setErrors({ _form: err instanceof ApiError ? err.message : 'Ошибка сохранения черновика' });
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      if (editingRequest) {
        await updateRequest(editingRequest.id, payload);
        await submitRequest(editingRequest.id);
      } else {
        await createRequest(payload, true);
      }
      await reloadRequests();
      setFormOpen(false);
    } catch (err) {
      setErrors({ _form: err instanceof ApiError ? err.message : 'Ошибка отправки заявки' });
    } finally {
      setSaving(false);
    }
  };

  const f = (field: string, val: string) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field] || errors._form) setErrors(er => { const u = { ...er }; delete u[field]; delete u._form; return u; });
  };

  const openReview = (req: OperationRequest) => {
    setReviewRequest(req);
    setReviewStep('review');
    setTempParticipants([]);
    setParticipantLogin('');
    setParticipantRole('');
    setParticipantError('');
  };

  const handleAddTempParticipant = async () => {
    setParticipantError('');
    const login = participantLogin.trim();
    if (!login) { setParticipantError('Введите логин участника'); return; }
    if (!participantRole) { setParticipantError('Выберите роль'); return; }

    if (tempParticipants.find(p => p.login.toLowerCase() === login.toLowerCase())) {
      setParticipantError(`Участник @${login} уже добавлен в команду`);
      return;
    }

    setAddingParticipant(true);
    try {
      const user = await lookupUser(login);
      setTempParticipants(prev => [...prev, {
        id: Date.now().toString(),
        login: user.login,
        name: user.fullName,
        role: participantRole as ParticipantRole,
      }]);
      setParticipantLogin('');
      setParticipantRole('');
    } catch (err) {
      setParticipantError(err instanceof ApiError ? err.message : 'Не удалось найти пользователя');
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleConfirm = async () => {
    if (!reviewRequest) return;
    setConfirming(true);
    setParticipantError('');
    try {
      await approveRequest(
        reviewRequest.id,
        tempParticipants.map(p => ({ login: p.login, role: p.role })),
      );
      await reloadRequests();
      setReviewRequest(null);
      onOperationApproved();
    } catch (err) {
      setParticipantError(err instanceof ApiError ? err.message : 'Не удалось создать операцию');
    } finally {
      setConfirming(false);
    }
  };

  const openRejectFromReview = () => {
    if (!reviewRequest) return;
    setRejectDialogId(reviewRequest.id);
    setRejectionReason('');
    setRejectError('');
    setReviewRequest(null);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) { setRejectError('Укажите причину отклонения'); return; }
    if (!rejectDialogId) return;
    try {
      const updated = await rejectRequest(rejectDialogId, rejectionReason.trim());
      setRequests(prev => prev.map(r => r.id === rejectDialogId ? updated : r));
      setRejectDialogId(null);
      setRejectionReason('');
      setRejectError('');
    } catch (err) {
      setRejectError(err instanceof ApiError ? err.message : 'Ошибка отклонения заявки');
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Заявки на операцию</Typography>
        {isCustomer && (
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Создать заявку</Button>
        )}
      </Box>

      {isOrganizer && visibleRequests.filter(r => r.status === 'pending').length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          У вас <strong>{visibleRequests.filter(r => r.status === 'pending').length}</strong> новых заявок на рассмотрении
        </Alert>
      )}

      {visibleRequests.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Description sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {isCustomer ? 'У вас нет заявок. Нажмите «Создать заявку» для начала.' : 'Входящих заявок нет.'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {visibleRequests.map(req => (
            <Card key={req.id} variant="outlined"
              sx={{ borderColor: req.status === 'rejected' ? 'error.light' : req.status === 'approved' ? 'success.light' : 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                      <Typography variant="h6">{req.name}</Typography>
                      <Chip icon={STATUS_ICONS[req.status] as any} label={STATUS_LABELS[req.status]}
                        color={STATUS_COLORS[req.status]} size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {isOrganizer ? `Заказчик: @${req.createdBy}` : `Организатор: @${req.organizerLogin}`}
                      {' · '}{new Date(req.createdAt).toLocaleDateString('ru-RU')}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, ml: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {isOrganizer && req.status === 'pending' && (
                      <Button size="small" variant="contained" startIcon={<Visibility />}
                        onClick={() => openReview(req)}>
                        Просмотр заявки
                      </Button>
                    )}
                    {isCustomer && (req.status === 'draft' || req.status === 'pending') && (
                      <Button size="small" startIcon={<Edit />} onClick={() => openEdit(req)}>
                        Редактировать
                      </Button>
                    )}
                    {isCustomer && (
                      <Button size="small" color="error" startIcon={<Delete />}
                        onClick={async () => {
                          if (!confirm('Удалить заявку?')) return;
                          try {
                            await deleteRequest(req.id);
                            setRequests(prev => prev.filter(r => r.id !== req.id));
                          } catch (err) {
                            alert(err instanceof ApiError ? err.message : 'Ошибка удаления');
                          }
                        }}>
                        Удалить
                      </Button>
                    )}
                    <IconButton size="small" onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}>
                      {expandedId === req.id ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                </Box>

                {req.status === 'rejected' && req.rejectionReason && (
                  <Alert severity="error" sx={{ mt: 1.5 }}>
                    <strong>Причина отклонения:</strong> {req.rejectionReason}
                  </Alert>
                )}

                <Collapse in={expandedId === req.id}>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Описание</Typography>
                      <Typography variant="body2" sx={{ mb: 1.5 }}>{req.description || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Цель</Typography>
                      <Typography variant="body2" sx={{ mb: 1.5 }}>{GOALS.find(g => g.value === req.goal)?.label || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Планируемая дата</Typography>
                      <Typography variant="body2">{req.plannedDate ? new Date(req.plannedDate).toLocaleDateString('ru-RU') : '—'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Объект воздействия</Typography>
                      <Typography variant="body2">{req.targetFullName || '—'}</Typography>
                      {req.targetBirthDate && <Typography variant="caption" color="text.secondary">{new Date(req.targetBirthDate).toLocaleDateString('ru-RU')}</Typography>}
                      <Typography variant="body2" sx={{ mt: 0.5, mb: 1.5 }}>{req.targetDescription}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Желаемый результат</Typography>
                      <Typography variant="body2" sx={{ mb: 1.5 }}>{req.desiredResult || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Критерии успеха</Typography>
                      <Typography variant="body2">{req.successCriteria || '—'}</Typography>
                    </Grid>
                  </Grid>
                </Collapse>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={!!reviewRequest} onClose={() => setReviewRequest(null)} maxWidth="md" fullWidth scroll="paper">
        {reviewRequest && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                {reviewStep === 'review' ? 'Просмотр заявки' : 'Добавление участников'}
                <Chip label={STATUS_LABELS[reviewRequest.status]} color={STATUS_COLORS[reviewRequest.status]}
                  size="small" sx={{ ml: 1.5 }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="1. Заявка" size="small" color={reviewStep === 'review' ? 'primary' : 'default'} />
                <ArrowForward sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Chip label="2. Участники" size="small" color={reviewStep === 'participants' ? 'primary' : 'default'} />
              </Box>
            </DialogTitle>

            <DialogContent dividers>
              {reviewStep === 'review' ? (
                <Stack spacing={2.5}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Общие сведения</Typography>
                    <Typography variant="h6" gutterBottom>{reviewRequest.name}</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>{reviewRequest.description}</Typography>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Цель</Typography>
                        <Typography variant="body2">{GOALS.find(g => g.value === reviewRequest.goal)?.label || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Планируемая дата</Typography>
                        <Typography variant="body2">{reviewRequest.plannedDate ? new Date(reviewRequest.plannedDate).toLocaleDateString('ru-RU') : '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Заказчик</Typography>
                        <Typography variant="body2">@{reviewRequest.createdBy}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Организация</Typography>
                        <Typography variant="body2">{reviewRequest.organization || '—'}</Typography>
                      </Box>
                    </Box>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Объект воздействия</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{reviewRequest.targetFullName}</Typography>
                    {reviewRequest.targetBirthDate && (
                      <Typography variant="caption" color="text.secondary">
                        {new Date(reviewRequest.targetBirthDate).toLocaleDateString('ru-RU')}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ mt: 1, mb: reviewRequest.targetBehavior ? 1 : 0 }}>
                      {reviewRequest.targetDescription}
                    </Typography>
                    {reviewRequest.targetBehavior && (
                      <>
                        <Typography variant="caption" color="text.secondary">Особенности поведения</Typography>
                        <Typography variant="body2">{reviewRequest.targetBehavior}</Typography>
                      </>
                    )}
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Ожидаемый результат</Typography>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>{reviewRequest.desiredResult}</Typography>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Критерии успеха</Typography>
                    <Typography variant="body2">{reviewRequest.successCriteria}</Typography>
                  </Paper>
                </Stack>
              ) : (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Добавьте участников операции. После нажатия «Подтвердить заявку» операция будет создана со статусом <strong>Планирование</strong>.
                  </Alert>

                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Добавить участника</Typography>
                    {participantError && <Alert severity="error" sx={{ mb: 1.5 }}>{participantError}</Alert>}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
                      <TextField
                        label="Логин участника"
                        value={participantLogin}
                        size="small"
                        onChange={e => { setParticipantLogin(e.target.value); setParticipantError(''); }}
                        placeholder="например: ivanov"
                        sx={{ flex: '1 1 220px', minWidth: 200 }}
                      />
                      <FormControl size="small" sx={{ flex: '1 1 200px', minWidth: 180 }}>
                        <InputLabel>Роль</InputLabel>
                        <Select value={participantRole} label="Роль"
                          onChange={e => { setParticipantRole(e.target.value as ParticipantRole); setParticipantError(''); }}>
                          {PARTICIPANT_ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <Button variant="contained" startIcon={<Add />} onClick={handleAddTempParticipant}
                        disabled={addingParticipant}
                        sx={{ height: 40, flex: '0 0 auto', alignSelf: 'flex-start', px: 3 }}>
                        {addingParticipant ? 'Поиск…' : 'Добавить'}
                      </Button>
                    </Box>
                  </Paper>

                  {tempParticipants.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                      Участники не добавлены
                    </Typography>
                  ) : (
                    <List dense>
                      {tempParticipants.map(p => (
                        <ListItem key={p.id} divider
                          sx={{ bgcolor: 'background.paper', borderRadius: 1, mb: 0.5 }}>
                          <ListItemText
                            primary={p.name}
                            secondary={`@${p.login} · ${PARTICIPANT_ROLES.find(r => r.value === p.role)?.label}`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton size="small" edge="end"
                              onClick={() => setTempParticipants(prev => prev.filter(x => x.id !== p.id))}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
              <Button color="error" startIcon={<Cancel />} onClick={openRejectFromReview}>
                Отклонить заявку
              </Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {reviewStep === 'participants' && (
                  <Button onClick={() => setReviewStep('review')}>Назад</Button>
                )}
                {reviewStep === 'review' ? (
                  <Button variant="contained" startIcon={<Group />}
                    onClick={() => setReviewStep('participants')}>
                    Перейти к добавлению участников
                  </Button>
                ) : (
                  <Button variant="contained" color="success" startIcon={<CheckCircle />}
                    disabled={confirming}
                    onClick={handleConfirm}>
                    {confirming ? 'Создание…' : 'Создать операцию'}
                  </Button>
                )}
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={!!rejectDialogId} onClose={() => setRejectDialogId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Отклонить заявку</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>Укажите причину отклонения заявки:</Typography>
          <TextField label="Причина отклонения" value={rejectionReason} fullWidth multiline rows={3} required
            onChange={e => { setRejectionReason(e.target.value); setRejectError(''); }}
            error={!!rejectError} helperText={rejectError} autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogId(null)}>Отмена</Button>
          <Button variant="contained" color="error" onClick={handleReject}>Отклонить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle>{editingRequest ? 'Редактировать заявку' : 'Создать заявку'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {hasErrors && (
              <Alert severity="warning" sx={{ mb: 2.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Заполните обязательные поля:</Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {Object.values(errors).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </Alert>
            )}

            <Card variant="outlined" sx={{ mb: 2.5 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Общие сведения</Typography>
                <Stack spacing={2}>
                  <TextField label="Название операции" value={form.name} required fullWidth
                    onChange={e => f('name', e.target.value)} error={!!errors.name} helperText={errors.name} />
                  <TextField label="Краткое описание" value={form.description} required fullWidth multiline rows={3}
                    onChange={e => f('description', e.target.value)} error={!!errors.description} helperText={errors.description} />
                  <TextField label="Предполагаемая дата проведения" type="date" value={form.plannedDate} required fullWidth
                    onChange={e => f('plannedDate', e.target.value)} error={!!errors.plannedDate} helperText={errors.plannedDate}
                    InputLabelProps={{ shrink: true }} />
                  <TextField label="Организация" value={form.organization} required fullWidth
                    onChange={e => f('organization', e.target.value)} error={!!errors.organization} helperText={errors.organization}
                    placeholder="Название компании заказчика" />
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2.5 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Объект воздействия</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField label="ФИО объекта" value={form.targetFullName} required fullWidth
                      onChange={e => f('targetFullName', e.target.value)} error={!!errors.targetFullName} helperText={errors.targetFullName} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Дата рождения" type="date" value={form.targetBirthDate} required fullWidth
                      onChange={e => f('targetBirthDate', e.target.value)} error={!!errors.targetBirthDate} helperText={errors.targetBirthDate}
                      InputLabelProps={{ shrink: true }} />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <TextField label="Краткая характеристика" value={form.targetDescription} required fullWidth multiline rows={4}
                    onChange={e => f('targetDescription', e.target.value)} error={!!errors.targetDescription} helperText={errors.targetDescription} />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <TextField label="Известные особенности поведения" value={form.targetBehavior} fullWidth multiline rows={4}
                    onChange={e => f('targetBehavior', e.target.value)} />
                </Box>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2.5 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Цель операции</Typography>
                <FormControl fullWidth required error={!!errors.goal}>
                  <InputLabel>Цель операции</InputLabel>
                  <Select value={form.goal} label="Цель операции" onChange={e => f('goal', e.target.value)}>
                    {GOALS.map(g => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
                  </Select>
                  {errors.goal && <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>{errors.goal}</Typography>}
                </FormControl>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2.5 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Ожидаемый результат</Typography>
                <Stack spacing={2}>
                  <TextField label="Желаемый результат операции" value={form.desiredResult} required fullWidth multiline rows={3}
                    onChange={e => f('desiredResult', e.target.value)} error={!!errors.desiredResult} helperText={errors.desiredResult} />
                  <TextField label="Критерии успешного выполнения" value={form.successCriteria} required fullWidth multiline rows={3}
                    onChange={e => f('successCriteria', e.target.value)} error={!!errors.successCriteria} helperText={errors.successCriteria} />
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Организатор</Typography>
                <TextField label="Логин организатора" value={form.organizerLogin} required fullWidth
                  onChange={e => f('organizerLogin', e.target.value)} error={!!errors.organizerLogin} helperText={errors.organizerLogin}
                  placeholder="например: thebo" />
                {organizers.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Доступные организаторы: {organizers.map(o => `@${o.login}`).join(', ')}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setFormOpen(false)} disabled={saving}>Отмена</Button>
          <Button variant="outlined" onClick={() => handleSubmit(true)} disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить черновик'}
          </Button>
          <Button variant="contained" onClick={() => handleSubmit(false)} startIcon={<Add />} disabled={saving}>
            {saving ? 'Отправка…' : 'Отправить заявку'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
