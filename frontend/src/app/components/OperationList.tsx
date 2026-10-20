import { Operation } from '../types';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  Grid,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import { Add, Edit, Visibility } from '@mui/icons-material';

interface OperationListProps {
  operations: Operation[];
  onCreateNew?: () => void;
  onEdit: (operation: Operation) => void;
  onView: (operation: Operation) => void;
  onStatusChange: (operationId: string, newStatus: Operation['status']) => void;
  canEdit?: boolean;
  emptyHint?: string;
}

export function OperationList({
  operations, onCreateNew, onEdit, onView, onStatusChange,
  canEdit = true, emptyHint,
}: OperationListProps) {
  const getStatusColor = (status: Operation['status']) => {
    const colors: Record<Operation['status'], 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
      draft: 'default', planning: 'primary', active: 'warning',
      ready: 'info', launch: 'warning', running: 'success', completed: 'success', cancelled: 'error',
    };
    return colors[status] ?? 'default';
  };

  const getStatusLabel = (status: Operation['status']) => ({
    draft: 'Черновик', planning: 'Планирование', active: 'В работе',
    ready: 'Готова к запуску', launch: 'Запуск', running: 'Во сне', completed: 'Завершена', cancelled: 'Отменена',
  }[status] ?? status);

  const canChangeStatus = (operation: Operation, newStatus: Operation['status']) => {
    const transitions: Record<Operation['status'], Operation['status'][]> = {
      draft: ['planning'],
      planning: ['ready', 'cancelled'],
      active: ['planning', 'cancelled'],
      ready: ['running', 'cancelled'],
      running: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
    return transitions[operation.status]?.includes(newStatus) ?? false;
  };

  const isOperationValid = (operation: Operation) => {
    return operation.name && operation.target?.fullName && operation.target?.birthDate &&
           operation.target?.description && operation.customer?.fullName &&
           operation.customer?.company && operation.date && operation.successCriteria;
  };

  const handleStatusChange = (operation: Operation, newStatus: Operation['status']) => {
    if (!canChangeStatus(operation, newStatus)) {
      alert('Недопустимый переход статуса');
      return;
    }

    if ((newStatus === 'active' || newStatus === 'planning') && !isOperationValid(operation)) {
      alert('Не заполнены обязательные данные операции');
      return;
    }

    onStatusChange(operation.id, newStatus);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Управление операциями</Typography>
        {onCreateNew && (
          <Button variant="contained" startIcon={<Add />} onClick={onCreateNew}>
            Создать операцию
          </Button>
        )}
      </Box>

      {operations.length === 0 && (
        <Alert severity="info">
          {emptyHint ?? 'Нет операций. Создайте новую операцию для начала работы.'}
        </Alert>
      )}

      <Grid container spacing={3}>
        {operations.map((operation) => (
          <Grid item xs={12} md={6} lg={4} key={operation.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Typography variant="h6" component="div" sx={{ flex: 1 }}>
                    {operation.name || 'Без названия'}
                  </Typography>
                  <Chip
                    label={getStatusLabel(operation.status)}
                    color={getStatusColor(operation.status)}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Объект:</strong> {operation.target?.fullName || 'Не указан'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Заказчик:</strong> {operation.customer?.fullName ? `${operation.customer.fullName}${operation.customer.company ? `, ${operation.customer.company}` : ''}` : 'Не указан'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Дата:</strong> {operation.date ? new Date(operation.date).toLocaleDateString('ru-RU') : 'Не указана'}
                </Typography>

                {!isOperationValid(operation) && operation.status !== 'draft' && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Заполните обязательные данные
                  </Alert>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="contained" startIcon={<Visibility />} onClick={() => onView(operation)}>
                    К операции
                  </Button>
                  {canEdit && (
                    <Button
                      size="small" startIcon={<Edit />} onClick={() => onEdit(operation)}
                      disabled={operation.status === 'completed' || operation.status === 'cancelled'}
                    >
                      Редактировать
                    </Button>
                  )}
                </Box>

                {canEdit && (
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Статус</InputLabel>
                    <Select
                      value={operation.status} label="Статус"
                      onChange={(e) => handleStatusChange(operation, e.target.value as Operation['status'])}
                    >
                      <MenuItem value="draft" disabled={!canChangeStatus(operation, 'draft')}>Черновик</MenuItem>
                      <MenuItem value="planning" disabled={!canChangeStatus(operation, 'planning')}>Планирование</MenuItem>
                      <MenuItem value="active" disabled={!canChangeStatus(operation, 'active')}>В работе</MenuItem>
                      <MenuItem value="ready" disabled={!canChangeStatus(operation, 'ready')}>Готова к запуску</MenuItem>
                      <MenuItem value="running" disabled={!canChangeStatus(operation, 'running')}>Во сне</MenuItem>
                      <MenuItem value="completed" disabled={!canChangeStatus(operation, 'completed')}>Завершена</MenuItem>
                      <MenuItem value="cancelled" disabled={!canChangeStatus(operation, 'cancelled')}>Отменена</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
