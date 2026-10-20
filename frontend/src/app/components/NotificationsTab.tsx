import { useEffect, useState, useCallback } from 'react';
import { AppNotification } from '../types';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';
import { ApiError } from '../api/client';
import {
  Box, Typography, Card, CardContent, List, ListItem, ListItemText,
  Divider, CircularProgress, Alert, Button, Chip, IconButton,
} from '@mui/material';
import { Notifications as NotificationsIcon, MarkEmailRead } from '@mui/icons-material';

const TYPE_COLORS: Record<AppNotification['type'], 'primary' | 'success' | 'error' | 'info'> = {
  request_submitted: 'primary',
  request_approved: 'success',
  request_rejected: 'error',
  operation_participant_added: 'info',
};

interface NotificationsTabProps {
  onUnreadChange?: (count: number) => void;
  onNavigateToRequests?: () => void;
  onNavigateToOperations?: () => void;
}

export function NotificationsTab({
  onUnreadChange,
  onNavigateToRequests,
  onNavigateToOperations,
}: NotificationsTabProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchNotifications();
      setNotifications(list);
      const unread = list.filter(n => !n.read).length;
      onUnreadChange?.(unread);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить уведомления');
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleMarkRead = async (notification: AppNotification) => {
    if (notification.read) {
      handleNavigate(notification);
      return;
    }
    try {
      const updated = await markNotificationRead(notification.id);
      setNotifications(prev => {
        const next = prev.map(n => (n.id === updated.id ? updated : n));
        onUnreadChange?.(next.filter(n => !n.read).length);
        return next;
      });
      handleNavigate(notification);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отметить уведомление');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      onUnreadChange?.(0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отметить уведомления');
    }
  };

  const handleNavigate = (notification: AppNotification) => {
    if (notification.referenceType === 'request') {
      onNavigateToRequests?.();
    } else if (notification.referenceType === 'operation') {
      onNavigateToOperations?.();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <NotificationsIcon />
          <Typography variant="h5">Уведомления</Typography>
          {unreadCount > 0 && (
            <Chip label={`${unreadCount} новых`} color="primary" size="small" />
          )}
        </Box>
        {unreadCount > 0 && (
          <Button startIcon={<MarkEmailRead />} onClick={handleMarkAllRead}>
            Прочитать все
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : notifications.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Уведомлений пока нет
            </Typography>
          ) : (
            <List>
              {notifications.map((notification, index) => (
                  <Box key={notification.id}>
                    <ListItem
                      alignItems="flex-start"
                      sx={{
                        bgcolor: notification.read ? 'transparent' : 'action.hover',
                        borderRadius: 1,
                        cursor: 'pointer',
                      }}
                      onClick={() => handleMarkRead(notification)}
                      secondaryAction={
                        !notification.read && (
                          <IconButton
                            edge="end"
                            title="Отметить прочитанным"
                            onClick={(e) => { e.stopPropagation(); handleMarkRead(notification); }}
                          >
                            <MarkEmailRead fontSize="small" />
                          </IconButton>
                        )
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Chip
                              label={notification.title}
                              color={TYPE_COLORS[notification.type]}
                              size="small"
                              variant={notification.read ? 'outlined' : 'filled'}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              {notification.message}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTimestamp(notification.createdAt)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < notifications.length - 1 && <Divider component="li" />}
                  </Box>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
