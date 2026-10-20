package com.inception.core.service;

import com.inception.auth.security.UserPrincipal;
import com.inception.core.entity.InceptionOperation;
import com.inception.core.entity.OperationParticipant;
import com.inception.core.entity.ParticipantRole;
import com.inception.core.exception.RequestException;
import com.inception.core.repository.InceptionOperationRepository;
import com.inception.core.repository.OperationParticipantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OperationAccessService {

    private final InceptionOperationRepository operationRepository;
    private final OperationParticipantRepository participantRepository;

    public InceptionOperation loadOperationForView(Long operationId, UserPrincipal principal) {
        if (principal == null) {
            throw new RequestException("Требуется авторизация");
        }
        InceptionOperation operation = operationRepository.findDetailedById(operationId)
                .orElseThrow(() -> new RequestException("Операция не найдена"));

        boolean isOrganizer = isOrganizerOwner(operation, principal)
                && hasPrivilege(principal, "INCEPTION_VIEW_OPERATIONS");
        boolean isParticipant = participantRepository.existsByOperationIdAndUserId(operationId, principal.getId())
                && hasPrivilege(principal, "INCEPTION_VIEW_ASSIGNED_OPERATIONS");

        if (!isOrganizer && !isParticipant) {
            throw new RequestException("Недостаточно прав для просмотра операции");
        }
        return operation;
    }

    public boolean isOrganizerOwner(InceptionOperation operation, UserPrincipal principal) {
        return operation.getCreatedBy().getId().equals(principal.getId());
    }

    public void requireOrganizerOwner(InceptionOperation operation, UserPrincipal principal) {
        if (!isOrganizerOwner(operation, principal)) {
            throw new RequestException("Недостаточно прав");
        }
    }

    public boolean hasParticipantRole(Long operationId, Long userId, ParticipantRole role) {
        return participantRepository.findByOperationId(operationId).stream()
                .anyMatch(p -> p.getUser().getId().equals(userId) && p.getRole() == role);
    }

    public boolean hasPrivilege(UserPrincipal principal, String privilege) {
        return principal.getPrivileges().contains(privilege);
    }

    public void requirePrivilege(UserPrincipal principal, String privilege) {
        if (!hasPrivilege(principal, privilege)) {
            throw new RequestException("Недостаточно прав");
        }
    }
}
