import { useState } from 'react';
import {
  Box, Button, Card, CardContent, TextField, Typography,
  Alert, Divider, InputAdornment, IconButton, CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Lock } from '@mui/icons-material';
import { loginRequest } from '../api/auth';
import { ApiError } from '../api/client';
import type { AuthSession } from '../types';

interface LoginPageProps {
  onSuccess: (session: AuthSession) => void;
  onGoRegister: () => void;
}

export function LoginPage({ onSuccess, onGoRegister }: LoginPageProps) {
  const [form, setForm] = useState({ login: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.login.trim()) e.login = 'Введите логин';
    if (!form.password) e.password = 'Введите пароль';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const session = await loginRequest({
        login: form.login.trim(),
        password: form.password,
      });
      onSuccess(session);
    } catch (err) {
      if (err instanceof ApiError) {
        setAuthError(err.message);
      } else {
        setAuthError('Не удалось подключиться к серверу. Проверьте, что бэкенд запущен.');
      }
    } finally {
      setLoading(false);
    }
  };

  const f = (field: string, val: string) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(er => { const u = { ...er }; delete u[field]; return u; });
    setAuthError('');
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
            Войдите в систему для продолжения
          </Typography>
        </Box>

        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {authError && <Alert severity="error">{authError}</Alert>}

                <TextField
                  label="Логин" value={form.login} fullWidth autoFocus disabled={loading}
                  onChange={(e) => f('login', e.target.value)}
                  error={!!errors.login} helperText={errors.login}
                />

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

                <Button
                  type="submit" variant="contained" size="large" fullWidth sx={{ mt: 1 }}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
                >
                  {loading ? 'Вход…' : 'Войти'}
                </Button>
              </Box>
            </form>

            <Divider sx={{ my: 2.5 }} />

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Нет аккаунта?</Typography>
              <Button variant="outlined" fullWidth onClick={onGoRegister} disabled={loading}>
                Зарегистрироваться
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
