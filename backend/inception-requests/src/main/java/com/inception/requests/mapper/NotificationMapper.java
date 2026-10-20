package com.inception.requests.mapper;

import com.inception.requests.dto.NotificationResponse;
import com.inception.requests.entity.Notification;

public final class NotificationMapper {

    private NotificationMapper() {
    }

    public static NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(String.valueOf(notification.getId()))
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .read(notification.isRead())
                .referenceType(notification.getReferenceType())
                .referenceId(notification.getReferenceId() != null
                        ? String.valueOf(notification.getReferenceId()) : null)
                .createdAt(notification.getCreatedAt().toString())
                .build();
    }
}
