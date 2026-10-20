package com.inception.sedation.service;

import com.inception.architecture.entity.DreamLevel;
import com.inception.architecture.repository.DreamLevelRepository;
import com.inception.auth.entity.AppUser;
import com.inception.auth.repository.AppUserRepository;
import com.inception.auth.security.UserPrincipal;
import com.inception.core.entity.InceptionOperation;
import com.inception.core.entity.OperationParticipant;
import com.inception.core.entity.OperationPlanning;
import com.inception.core.entity.OperationStatus;
import com.inception.core.exception.RequestException;
import com.inception.core.repository.OperationParticipantRepository;
import com.inception.core.repository.OperationPlanningRepository;
import com.inception.core.service.OperationAccessService;
import com.inception.events.service.OperationEventService;
import com.inception.sedation.dto.SedationConfigPayload;
import com.inception.sedation.dto.SedationConfigResponse;
import com.inception.sedation.entity.SedationConfig;
import com.inception.sedation.mapper.SedationMapper;
import com.inception.sedation.repository.SedationConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SedationPlanningService {

    private final SedationConfigRepository sedationConfigRepository;
    private final DreamLevelRepository dreamLevelRepository;
    private final OperationParticipantRepository participantRepository;
    private final OperationPlanningRepository planningRepository;
    private final AppUserRepository appUserRepository;
    private final OperationAccessService accessService;
    private final OperationEventService eventService;

    @Transactional(readOnly = true)
    public List<SedationConfigResponse> listSedationConfigs(Long operationId, UserPrincipal principal) {
        accessService.loadOperationForView(operationId, principal);
        return sedationConfigRepository.findByOperationIdOrderByIdAsc(operationId).stream()
                .map(SedationMapper::toSedationResponse)
                .toList();
    }

    @Transactional
    public SedationConfigResponse createSedationConfig(
            Long operationId,
            SedationConfigPayload payload,
            UserPrincipal principal
    ) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        OperationPlanning planning = loadPlanning(operation);
        ensureSedationEditable(operation, planning, principal);

        SedationConfig config = new SedationConfig();
        config.setOperation(operation);
        applySedationPayload(config, operation, payload);
        return SedationMapper.toSedationResponse(sedationConfigRepository.save(config));
    }

    @Transactional
    public SedationConfigResponse updateSedationConfig(
            Long operationId,
            Long configId,
            SedationConfigPayload payload,
            UserPrincipal principal
    ) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        OperationPlanning planning = loadPlanning(operation);
        ensureSedationEditable(operation, planning, principal);

        SedationConfig config = sedationConfigRepository.findByIdAndOperationId(configId, operationId)
                .orElseThrow(() -> new RequestException("Конфигурация седации не найдена"));
        applySedationPayload(config, operation, payload);
        return SedationMapper.toSedationResponse(sedationConfigRepository.save(config));
    }

    @Transactional
    public void deleteSedationConfig(Long operationId, Long configId, UserPrincipal principal) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        OperationPlanning planning = loadPlanning(operation);
        ensureSedationEditable(operation, planning, principal);

        SedationConfig config = sedationConfigRepository.findByIdAndOperationId(configId, operationId)
                .orElseThrow(() -> new RequestException("Конфигурация седации не найдена"));
        sedationConfigRepository.delete(config);
    }

    @Transactional
    public void fixSedation(Long operationId, UserPrincipal principal) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        OperationPlanning planning = loadPlanning(operation);
        ensureSedationEditable(operation, planning, principal);
        accessService.requirePrivilege(principal, "INCEPTION_FIX_SEDATION");

        if (!planning.isArchitectureFixed()) {
            throw new RequestException("Сначала зафиксируйте архитектуру сна");
        }
        long configCount = sedationConfigRepository.countByOperationId(operationId);
        if (configCount == 0) {
            throw new RequestException("Добавьте хотя бы одну конфигурацию седации");
        }

        AppUser user = appUserRepository.findById(principal.getId())
                .orElseThrow(() -> new RequestException("Пользователь не найден"));
        planning.setSedationFixedAt(Instant.now());
        planning.setSedationFixedBy(user);
        planningRepository.save(planning);

        eventService.recordEvent(operation, principal.getUsername(),
                "Фиксация параметров седации",
                "Параметры седации зафиксированы: " + configCount + " конфигураций");
    }

    private void applySedationPayload(SedationConfig config, InceptionOperation operation, SedationConfigPayload payload) {
        Long levelId = Long.parseLong(payload.getLevelId());
        Long participantId = Long.parseLong(payload.getParticipantId());

        DreamLevel level = dreamLevelRepository.findByIdAndOperationId(levelId, operation.getId())
                .orElseThrow(() -> new RequestException("Уровень сна не найден"));
        OperationParticipant participant = participantRepository.findByIdAndOperationId(participantId, operation.getId())
                .orElseThrow(() -> new RequestException("Участник не найден"));

        config.setLevel(level);
        config.setParticipant(participant);
        config.setCompound(payload.getCompound().trim());
        config.setDosage(payload.getDosage());
        config.setDurationHours(payload.getDurationHours());
        config.setMethod(payload.getMethod().trim());
        config.setNotes(payload.getNotes() != null ? payload.getNotes().trim() : "");
    }

    private void ensureSedationEditable(InceptionOperation operation, OperationPlanning planning, UserPrincipal principal) {
        if (operation.getStatus() != OperationStatus.planning) {
            throw new RequestException("Редактирование доступно только в статусе «Планирование»");
        }
        if (planning.isSedationFixed()) {
            throw new RequestException("Параметры седации уже зафиксированы");
        }
        accessService.requirePrivilege(principal, "INCEPTION_MANAGE_SEDATION");
    }

    private OperationPlanning loadPlanning(InceptionOperation operation) {
        return planningRepository.findByOperationId(operation.getId())
                .orElseThrow(() -> new RequestException("Данные планирования не найдены"));
    }
}
