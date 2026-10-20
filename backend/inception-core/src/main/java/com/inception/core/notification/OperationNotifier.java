package com.inception.core.notification;

import com.inception.auth.entity.AppUser;
import com.inception.core.entity.InceptionOperation;
import com.inception.core.entity.NotificationType;

public interface OperationNotifier {

    void notifyUser(
            AppUser user,
            NotificationType type,
            String title,
            String message,
            String referenceType,
            Long referenceId
    );

    void notifyAllParticipants(
            InceptionOperation operation,
            NotificationType type,
            String title,
            String message
    );
}
