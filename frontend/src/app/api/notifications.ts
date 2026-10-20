import { apiFetch } from './client';
import type { AppNotification } from '../types';

interface NotificationDto {
  id: string;
  type: AppNotification['type'];
  title: string;
  message: string;
  read: boolean;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

function toNotification(dto: NotificationDto): AppNotification {
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    message: dto.message,
    read: dto.read,
    referenceType: dto.referenceType,
    referenceId: dto.referenceId,
    createdAt: dto.createdAt,
  };
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const list = await apiFetch<NotificationDto[]>('/api/notifications');
  return list.map(toNotification);
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await apiFetch<{ count: number }>('/api/notifications/unread-count');
  return res.count;
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const dto = await apiFetch<NotificationDto>(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });
  return toNotification(dto);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch<void>('/api/notifications/read-all', { method: 'POST' });
}
