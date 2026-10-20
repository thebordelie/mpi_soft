import { useState, useEffect } from 'react';
import { Operation } from '../types';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Grid,
  Alert,
} from '@mui/material';
import { Save, Cancel, Add } from '@mui/icons-material';
import { Assignment, Person, Business, CalendarMonth, EmojiEvents } from '@mui/icons-material';

interface OperationEditorProps {
  operation: Operation | null;
  onSave: (operation: Operation) => void | Promise<void>;
  onCancel: () => void;
  hideTitle?: boolean;
  saving?: boolean;
}

const emptyForm = (): Operation => ({
  id: '',
  name: '',
  status: 'draft',
  target: { fullName: '', birthDate: '', description: '' },
  customer: { fullName: '', company: '' },
  date: '',
  successCriteria: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function SectionCard({ icon, title, children }: SectionCardProps) {
  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

export function OperationEditor({ operation, onSave, onCancel, hideTitle, saving }: OperationEditorProps) {
  const isNew = !operation?.id || operation.id === '';
  const [formData, setFormData] = useState<Operation>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (operation) {
      setFormData(operation);
    } else {
      setFormData(emptyForm());
    }
    setErrors({});
  }, [operation]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Название операции обязательно';
    if (!formData.target.fullName.trim()) newErrors['target.fullName'] = 'ФИО объекта обязательно';
    if (!formData.target.birthDate) newErrors['target.birthDate'] = 'Дата рождения объекта обязательна';
    if (!formData.target.description.trim()) newErrors['target.description'] = 'Краткая характеристика объекта обязательна';
    if (!formData.customer.fullName.trim()) newErrors['customer.fullName'] = 'ФИО заказчика обязательно';
    if (!formData.customer.company.trim()) newErrors['customer.company'] = 'Компания заказчика обязательна';
    if (!formData.date) newErrors.date = 'Дата проведения обязательна';
    if (!formData.successCriteria.trim()) newErrors.successCriteria = 'Критерий успеха обязателен';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || saving) return;
    await onSave({
      ...formData,
      status: isNew ? 'planning' : formData.status,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleChange = (field: string, value: string) => {
    if (field.startsWith('target.')) {
      const key = field.replace('target.', '') as keyof Operation['target'];
      setFormData(prev => ({ ...prev, target: { ...prev.target, [key]: value } }));
    } else if (field.startsWith('customer.')) {
      const key = field.replace('customer.', '') as keyof Operation['customer'];
      setFormData(prev => ({ ...prev, customer: { ...prev.customer, [key]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    if (errors[field]) {
      setErrors(prev => { const u = { ...prev }; delete u[field]; return u; });
    }
  };

  const isLaunched = !isNew && (formData.status === 'running' || formData.status === 'completed' || formData.status === 'cancelled');
  const canEditFields = isNew || !isLaunched;
  const customerReadOnly = !isNew;
  const errorList = Object.values(errors);

  return (
    <Box>
      {!hideTitle && (
        <Typography variant="h5" sx={{ mb: 1 }}>
          {isNew ? 'Создание новой операции' : 'Редактирование операции'}
        </Typography>
      )}

      {isNew && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Статус операции: <strong>Черновик</strong>
        </Alert>
      )}

      {isLaunched && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Операция запущена — редактирование данных недоступно.
        </Alert>
      )}

      <form onSubmit={handleSubmit}>

        <SectionCard icon={<Assignment />} title="Операция">
          <TextField
            fullWidth
            label="Название операции"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            required
            disabled={!canEditFields}
          />
        </SectionCard>

        <SectionCard icon={<Person />} title="Объект воздействия">
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ФИО объекта"
                value={formData.target.fullName}
                onChange={(e) => handleChange('target.fullName', e.target.value)}
                error={!!errors['target.fullName']}
                helperText={errors['target.fullName']}
                required
                disabled={!canEditFields}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Дата рождения"
                type="date"
                value={formData.target.birthDate}
                onChange={(e) => handleChange('target.birthDate', e.target.value)}
                error={!!errors['target.birthDate']}
                helperText={errors['target.birthDate']}
                InputLabelProps={{ shrink: true }}
                required
                disabled={!canEditFields}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Краткая характеристика"
              value={formData.target.description}
              onChange={(e) => handleChange('target.description', e.target.value)}
              error={!!errors['target.description']}
              helperText={errors['target.description']}
              multiline
              rows={5}
              required
              disabled={!canEditFields}
            />
          </Box>
        </SectionCard>

        <SectionCard icon={<Business />} title="Заказчик">
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ФИО заказчика"
                value={formData.customer.fullName}
                onChange={(e) => handleChange('customer.fullName', e.target.value)}
                error={!!errors['customer.fullName']}
                helperText={errors['customer.fullName']}
                required
                disabled={customerReadOnly}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Компания"
                value={formData.customer.company}
                onChange={(e) => handleChange('customer.company', e.target.value)}
                error={!!errors['customer.company']}
                helperText={errors['customer.company']}
                required
                disabled={customerReadOnly}
              />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard icon={<CalendarMonth />} title="Дата проведения">
          <TextField
            label="Дата проведения"
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            error={!!errors.date}
            helperText={errors.date}
            InputLabelProps={{ shrink: true }}
            required
            disabled={!canEditFields}
            sx={{ minWidth: 240 }}
          />
        </SectionCard>

        <SectionCard icon={<EmojiEvents />} title="Критерий успеха">
          <TextField
            fullWidth
            label="Критерий успеха операции"
            value={formData.successCriteria}
            onChange={(e) => handleChange('successCriteria', e.target.value)}
            error={!!errors.successCriteria}
            helperText={errors.successCriteria}
            multiline
            rows={5}
            required
            disabled={!canEditFields}
          />
        </SectionCard>

        {errorList.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Необходимо заполнить обязательные данные:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {errorList.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" startIcon={<Cancel />} onClick={onCancel}>
            Отмена
          </Button>
          <Button type="submit" variant="contained" startIcon={isNew ? <Add /> : <Save />} disabled={saving || !canEditFields}>
            {saving ? 'Сохранение...' : isNew ? 'Создать' : 'Сохранить'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
