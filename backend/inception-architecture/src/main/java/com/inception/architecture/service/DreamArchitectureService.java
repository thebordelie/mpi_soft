package com.inception.architecture.service;

import com.inception.architecture.dto.DreamLevelPayload;
import com.inception.architecture.dto.DreamLevelResponse;
import com.inception.architecture.dto.KeyEventPayload;
import com.inception.architecture.entity.DreamKeyEvent;
import com.inception.architecture.entity.DreamLevel;
import com.inception.architecture.mapper.ArchitectureMapper;
import com.inception.architecture.repository.DreamKeyEventRepository;
import com.inception.architecture.repository.DreamLevelRepository;
import com.inception.auth.entity.AppUser;
import com.inception.auth.repository.AppUserRepository;
import com.inception.auth.security.UserPrincipal;
import com.inception.core.entity.InceptionOperation;
import com.inception.core.entity.NotificationType;
import com.inception.core.entity.OperationParticipant;
import com.inception.core.entity.OperationPlanning;
import com.inception.core.entity.OperationStatus;
import com.inception.core.exception.RequestException;
import com.inception.core.notification.OperationNotifier;
import com.inception.core.repository.OperationParticipantRepository;
import com.inception.core.repository.OperationPlanningRepository;
import com.inception.core.service.OperationAccessService;
import com.inception.events.service.OperationEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class DreamArchitectureService {

    private final DreamLevelRepository dreamLevelRepository;
    private final DreamKeyEventRepository keyEventRepository;
    private final OperationParticipantRepository participantRepository;
    private final OperationPlanningRepository planningRepository;
    private final AppUserRepository appUserRepository;
    private final OperationAccessService accessService;
    private final OperationEventService eventService;
    private final OperationNotifier notifier;

    @Transactional(readOnly = true)
    public List<DreamLevelResponse> listDreamLevels(Long operationId, UserPrincipal principal) {
        accessService.loadOperationForView(operationId, principal);
        return dreamLevelRepository.findByOperationIdOrderBySortOrderAscIdAsc(operationId).stream()
                .map(level -> ArchitectureMapper.toDreamLevelResponse(
                        level,
                        keyEventRepository.findByLevelIdOrderByIdAsc(level.getId())
                ))
                .toList();
    }

    @Transactional
    public DreamLevelResponse createDreamLevel(Long operationId, DreamLevelPayload payload, UserPrincipal principal) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        OperationPlanning planning = loadPlanning(operation);
        ensureArchitectureEditable(operation, planning, principal);

        DreamLevel level = new DreamLevel();
        level.setOperation(operation);
        applyDreamLevelPayload(level, operation, payload);
        level.setSortOrder((int) dreamLevelRepository.countByOperationId(operationId));
        DreamLevel saved = dreamLevelRepository.save(level);
        saveKeyEvents(saved, payload.getKeyEvents(), operation.getId());

        return ArchitectureMapper.toDreamLevelResponse(
                dreamLevelRepository.findByIdAndOperationId(saved.getId(), operationId).orElse(saved),
                keyEventRepository.findByLevelIdOrderByIdAsc(saved.getId())
        );
    }

    @Transactional
    public DreamLevelResponse updateDreamLevel(
            Long operationId,
            Long levelId,
            DreamLevelPayload payload,
            UserPrincipal principal
    ) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        OperationPlanning planning = loadPlanning(operation);
        ensureArchitectureEditable(operation, planning, principal);

        DreamLevel level = dreamLevelRepository.findByIdAndOperationId(levelId, operationId)
                .orElseThrow(() -> new RequestException("Уровень сна не найден"));
        applyDreamLevelPayload(level, operation, payload);
        DreamLevel saved = dreamLevelRepository.save(level);
        keyEventRepository.deleteByLevelId(levelId);
        saveKeyEvents(saved, payload.getKeyEvents(), operation.getId());

        return ArchitectureMapper.toDreamLevelResponse(
                dreamLevelRepository.findByIdAndOperationId(saved.getId(), operationId).orElse(saved),
                keyEventRepository.findByLevelIdOrderByIdAsc(saved.getId())
        );
    }

    @Transactional
    public void deleteDreamLevel(Long operationId, Long levelId, UserPrincipal principal) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        OperationPlanning planning = loadPlanning(operation);
        ensureArchitectureEditable(operation, planning, principal);

        DreamLevel level = dreamLevelRepository.findByIdAndOperationId(levelId, operationId)
                .orElseThrow(() -> new RequestException("Уровень сна не найден"));
        dreamLevelRepository.delete(level);
    }

    @Transactional
    public void fixArchitecture(Long operationId, UserPrincipal principal) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        OperationPlanning planning = loadPlanning(operation);
        ensureArchitectureEditable(operation, planning, principal);
        accessService.requirePrivilege(principal, "INCEPTION_FIX_DREAM_ARCHITECTURE");

        List<DreamLevel> levels = dreamLevelRepository.findByOperationIdOrderBySortOrderAscIdAsc(operationId);
        if (levels.isEmpty()) {
            throw new RequestException("Добавьте хотя бы один уровень сна");
        }
        for (DreamLevel level : levels) {
            if (level.getParticipants().isEmpty()) {
                throw new RequestException("Уровень «" + level.getName() + "» должен иметь участников");
            }
        }

        AppUser user = appUserRepository.findById(principal.getId())
                .orElseThrow(() -> new RequestException("Пользователь не найден"));
        planning.setArchitectureFixedAt(Instant.now());
        planning.setArchitectureFixedBy(user);
        planningRepository.save(planning);

        eventService.recordEvent(operation, principal.getUsername(),
                "Фиксация архитектуры сна",
                "Архитектура сна зафиксирована: " + levels.size() + " уровней");

        if (!operation.getCreatedBy().getId().equals(principal.getId())) {
            notifier.notifyUser(
                    operation.getCreatedBy(),
                    NotificationType.request_submitted,
                    "Архитектура сна зафиксирована",
                    "Архитектура операции «" + operation.getName() + "» зафиксирована",
                    "operation",
                    operation.getId()
            );
        }
    }

    private void applyDreamLevelPayload(DreamLevel level, InceptionOperation operation, DreamLevelPayload payload) {
        level.setName(payload.getName().trim());
        level.setDescription(payload.getDescription() != null ? payload.getDescription().trim() : "");
        level.setGoal(payload.getGoal().trim());

        if (payload.getParentLevelId() != null && !payload.getParentLevelId().isBlank()) {
            Long parentId = Long.parseLong(payload.getParentLevelId());
            DreamLevel parent = dreamLevelRepository.findByIdAndOperationId(parentId, operation.getId())
                    .orElseThrow(() -> new RequestException("Родительский уровень не найден"));
            if (level.getId() != null && level.getId().equals(parentId)) {
                throw new RequestException("Уровень не может быть родителем самого себя");
            }
            level.setParentLevel(parent);
        } else {
            level.setParentLevel(null);
        }

        level.getParticipants().clear();
        level.getParticipants().addAll(resolveParticipants(operation.getId(), payload.getParticipantIds()));
    }

    private void saveKeyEvents(DreamLevel level, List<KeyEventPayload> payloads, Long operationId) {
        if (payloads == null) {
            return;
        }
        for (KeyEventPayload payload : payloads) {
            DreamKeyEvent event = new DreamKeyEvent();
            event.setLevel(level);
            event.setName(payload.getName().trim());
            event.setDescription(payload.getDescription() != null ? payload.getDescription().trim() : "");
            event.getParticipants().addAll(resolveParticipants(operationId, payload.getParticipantIds()));
            keyEventRepository.save(event);
        }
    }

    private Set<OperationParticipant> resolveParticipants(Long operationId, List<String> participantIds) {
        if (participantIds == null || participantIds.isEmpty()) {
            throw new RequestException("Укажите участников");
        }
        Set<OperationParticipant> result = new HashSet<>();
        for (String idStr : participantIds) {
            Long id = Long.parseLong(idStr);
            OperationParticipant participant = participantRepository.findByIdAndOperationId(id, operationId)
                    .orElseThrow(() -> new RequestException("Участник не найден"));
            result.add(participant);
        }
        return result;
    }

    private void ensureArchitectureEditable(InceptionOperation operation, OperationPlanning planning, UserPrincipal principal) {
        if (operation.getStatus() != OperationStatus.planning) {
            throw new RequestException("Редактирование доступно только в статусе «Планирование»");
        }
        if (planning.isArchitectureFixed()) {
            throw new RequestException("Архитектура сна уже зафиксирована");
        }
        accessService.requirePrivilege(principal, "INCEPTION_MANAGE_DREAM_ARCHITECTURE");
    }

    private OperationPlanning loadPlanning(InceptionOperation operation) {
        return planningRepository.findByOperationId(operation.getId())
                .orElseThrow(() -> new RequestException("Данные планирования не найдены"));
    }
}
