package com.inception.requests.dto;

import com.inception.core.entity.NotificationType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationResponse {

    private String id;
    private NotificationType type;
    private String title;
    private String message;
    private boolean read;
    private String referenceType;
    private String referenceId;
    private String createdAt;
}
