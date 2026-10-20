package com.inception.requests.service;

import com.inception.auth.entity.AppUser;
import com.inception.auth.security.UserPrincipal;
import com.inception.core.entity.InceptionOperation;
import com.inception.core.entity.NotificationType;
import com.inception.core.entity.OperationParticipant;
import com.inception.core.exception.RequestException;
import com.inception.core.notification.OperationNotifier;
import com.inception.core.repository.OperationParticipantRepository;
import com.inception.requests.dto.NotificationResponse;
import com.inception.requests.dto.UnreadCountResponse;
import com.inception.requests.entity.Notification;
import com.inception.requests.mapper.NotificationMapper;
import com.inception.requests.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService implements OperationNotifier {

    private final NotificationRepository notificationRepository;
    private final OperationParticipantRepository participantRepository;

    @Transactional(readOnly = true)
    public List<NotificationResponse> list(UserPrincipal principal) {
        requireAuth(principal);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(principal.getId()).stream()
                .map(NotificationMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse unreadCount(UserPrincipal principal) {
        requireAuth(principal);
        return UnreadCountResponse.builder()
                .count(notificationRepository.countByUserIdAndReadFalse(principal.getId()))
                .build();
    }

    @Transactional
    public NotificationResponse markRead(Long id, UserPrincipal principal) {
        requireAuth(principal);
        Notification notification = notificationRepository.findByIdAndUserId(id, principal.getId())
                .orElseThrow(() -> new RequestException("Уведомление не найдено"));
        notification.setRead(true);
        return NotificationMapper.toResponse(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllRead(UserPrincipal principal) {
        requireAuth(principal);
        notificationRepository.markAllReadByUserId(principal.getId());
    }

    @Override
    @Transactional
    public void notifyUser(
            AppUser user,
            NotificationType type,
            String title,
            String message,
            String referenceType,
            Long referenceId
    ) {
        if (user == null) {
            return;
        }
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setReferenceType(referenceType);
        notification.setReferenceId(referenceId);
        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void notifyAllParticipants(
            InceptionOperation operation,
            NotificationType type,
            String title,
            String message
    ) {
        for (OperationParticipant participant : participantRepository.findByOperationId(operation.getId())) {
            notifyUser(
                    participant.getUser(),
                    type,
                    title,
                    message,
                    "operation",
                    operation.getId()
            );
        }
    }

    private void requireAuth(UserPrincipal principal) {
        if (principal == null) {
            throw new RequestException("Требуется авторизация");
        }
    }
}
