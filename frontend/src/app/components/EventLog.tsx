import { LogEvent } from '../types';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import { History } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { fetchOperationEvents } from '../api/events';
import { ApiError } from '../api/client';

interface EventLogProps {
  operationId: string;
  refreshKey?: number;
}

export function EventLog({ operationId, refreshKey = 0 }: EventLogProps) {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchOperationEvents(operationId)
      .then(list => {
        if (!cancelled) setEvents(list);
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Не удалось загрузить журнал событий');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [operationId, refreshKey]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <History />
        <Typography variant="h5">Журнал событий</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : events.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Журнал событий пуст
            </Typography>
          ) : (
            <List>
              {events.map((event, index) => (
                <Box key={event.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" component="span">
                          {event.action}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {event.details}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Актор: @{event.actor}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTimestamp(event.timestamp)}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < events.length - 1 && <Divider component="li" />}
                </Box>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
