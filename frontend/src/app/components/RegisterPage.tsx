import { useState } from 'react';
import {
  Box, Button, Card, CardContent, TextField, Typography,
  Alert, Divider, InputAdornment, IconButton, FormControl,
  InputLabel, Select, MenuItem, CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Lock, ArrowBack } from '@mui/icons-material';
import { registerRequest } from '../api/auth';
import { ApiError } from '../api/client';
import type { AuthSession, UserRole } from '../types';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'organizer', label: 'Организатор' },
  { value: 'customer', label: 'Заказчик' },
  { value: 'architect', label: 'Архитектор' },
  { value: 'chemist', label: 'Химик' },
  { value: 'impersonator', label: 'Имперсонатор' },
  { value: 'extractor', label: 'Извлекатель' },
];

interface RegisterPageProps {
  onSuccess: (session: AuthSession) => void;
  onGoLogin: () => void;
}

export function RegisterPage({ onSuccess, onGoLogin }: RegisterPageProps) {
  const [form, setForm] = useState({
    login: '', fullName: '', role: '' as UserRole | '',
    password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.login.trim()) e.login = 'Введите логин';
    else if (form.login.trim().length < 3) e.login = 'Логин должен быть не менее 3 символов';
    if (!form.fullName.trim()) e.fullName = 'Введите ФИО';
    if (!form.role) e.role = 'Выберите роль';
    if (!form.password) e.password = 'Введите пароль';
    else if (form.password.length < 4) e.password = 'Пароль должен быть не менее 4 символов';
    if (!form.confirmPassword) e.confirmPassword = 'Подтвердите пароль';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Пароли не совпадают';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const session = await registerRequest({
        login: form.login.trim(),
        fullName: form.fullName.trim(),
        role: form.role as UserRole,
        password: form.password,
      });
      onSuccess(session);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('Не удалось подключиться к серверу. Проверьте, что бэкенд запущен.');
      }
    } finally {
      setLoading(false);
    }
  };

  const f = (field: string, val: string) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(er => { const u = { ...er }; delete u[field]; return u; });
    setServerError('');
  };

  return (
    <Box sx={{
      minHeight: '100vh', bgcolor: 'background.default',
      display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
    }}>
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: 2, bgcolor: 'primary.main',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2,
          }}>
            <Lock sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Inception Operation System</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Создайте аккаунт для доступа к системе
          </Typography>
        </Box>

        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {serverError && <Alert severity="error">{serverError}</Alert>}

                <TextField
                  label="Логин" value={form.login} fullWidth autoFocus disabled={loading}
                  onChange={(e) => f('login', e.target.value)}
                  error={!!errors.login} helperText={errors.login}
                  placeholder="например: ivanov"
                />

                <TextField
                  label="ФИО" value={form.fullName} fullWidth disabled={loading}
                  onChange={(e) => f('fullName', e.target.value)}
                  error={!!errors.fullName} helperText={errors.fullName}
                />

                <FormControl fullWidth error={!!errors.role} disabled={loading}>
                  <InputLabel>Роль в системе</InputLabel>
                  <Select value={form.role} label="Роль в системе" onChange={(e) => f('role', e.target.value)}>
                    {ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                  </Select>
                  {errors.role && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>{errors.role}</Typography>
                  )}
                </FormControl>

                <TextField
                  label="Пароль" value={form.password} fullWidth disabled={loading}
                  type={showPassword ? 'text' : 'password'}
                  onChange={(e) => f('password', e.target.value)}
                  error={!!errors.password} helperText={errors.password}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(p => !p)} edge="end" disabled={loading}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Подтверждение пароля" value={form.confirmPassword} fullWidth disabled={loading}
                  type={showPassword ? 'text' : 'password'}
                  onChange={(e) => f('confirmPassword', e.target.value)}
                  error={!!errors.confirmPassword} helperText={errors.confirmPassword}
                />

                <Button
                  type="submit" variant="contained" size="large" fullWidth sx={{ mt: 1 }}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
                >
                  {loading ? 'Регистрация…' : 'Зарегистрироваться'}
                </Button>
              </Box>
            </form>

            <Divider sx={{ my: 2.5 }} />

            <Button variant="text" fullWidth startIcon={<ArrowBack />} onClick={onGoLogin} disabled={loading}>
              Уже есть аккаунт? Войти
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
