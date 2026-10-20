package com.inception.scenarios.service;

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
import com.inception.scenarios.dto.ScenarioPayload;
import com.inception.scenarios.dto.ScenarioResponse;
import com.inception.scenarios.entity.InteractionScenario;
import com.inception.scenarios.mapper.ScenarioMapper;
import com.inception.scenarios.repository.InteractionScenarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ScenarioPlanningService {

    private final InteractionScenarioRepository scenarioRepository;
    private final DreamLevelRepository dreamLevelRepository;
    private final OperationParticipantRepository participantRepository;
    private final OperationPlanningRepository planningRepository;
    private final AppUserRepository appUserRepository;
    private final OperationAccessService accessService;
    private final OperationEventService eventService;

    @Transactional(readOnly = true)
    public List<ScenarioResponse> listScenarios(Long operationId, UserPrincipal principal) {
        accessService.loadOperationForView(operationId, principal);
        return scenarioRepository.findByOperationIdOrderByIdAsc(operationId).stream()
                .map(ScenarioMapper::toScenarioResponse)
                .toList();
    }

    @Transactional
    public ScenarioResponse createScenario(Long operationId, ScenarioPayload payload, UserPrincipal principal) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        OperationPlanning planning = loadPlanning(operation);
        ensureScenariosEditable(operation, planning, principal);

        InteractionScenario scenario = new InteractionScenario();
        scenario.setOperation(operation);
        applyScenarioPayload(scenario, operation, payload);
        return ScenarioMapper.toScenarioResponse(scenarioRepository.save(scenario));
    }

    @Transactional
    public ScenarioResponse updateScenario(
            Long operationId,
            Long scenarioId,
            ScenarioPayload payload,
            UserPrincipal principal
    ) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        OperationPlanning planning = loadPlanning(operation);
        ensureScenariosEditable(operation, planning, principal);

        InteractionScenario scenario = scenarioRepository.findByIdAndOperationId(scenarioId, operationId)
                .orElseThrow(() -> new RequestException("Сценарий не найден"));
        applyScenarioPayload(scenario, operation, payload);
        return ScenarioMapper.toScenarioResponse(scenarioRepository.save(scenario));
    }

    @Transactional
    public void deleteScenario(Long operationId, Long scenarioId, UserPrincipal principal) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        OperationPlanning planning = loadPlanning(operation);
        ensureScenariosEditable(operation, planning, principal);

        InteractionScenario scenario = scenarioRepository.findByIdAndOperationId(scenarioId, operationId)
                .orElseThrow(() -> new RequestException("Сценарий не найден"));
        scenarioRepository.delete(scenario);
    }

    @Transactional
    public void fixScenarios(Long operationId, UserPrincipal principal) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        OperationPlanning planning = loadPlanning(operation);
        ensureScenariosEditable(operation, planning, principal);
        accessService.requirePrivilege(principal, "INCEPTION_FIX_SCENARIOS");

        if (!planning.isArchitectureFixed()) {
            throw new RequestException("Сначала зафиксируйте архитектуру сна");
        }
        long scenarioCount = scenarioRepository.countByOperationId(operationId);
        if (scenarioCount == 0) {
            throw new RequestException("Добавьте хотя бы один сценарий");
        }

        AppUser user = appUserRepository.findById(principal.getId())
                .orElseThrow(() -> new RequestException("Пользователь не найден"));
        planning.setScenariosFixedAt(Instant.now());
        planning.setScenariosFixedBy(user);
        planningRepository.save(planning);

        eventService.recordEvent(operation, principal.getUsername(),
                "Фиксация сценариев",
                "Сценарии взаимодействия зафиксированы: " + scenarioCount + " сценариев");
    }

    private void applyScenarioPayload(InteractionScenario scenario, InceptionOperation operation, ScenarioPayload payload) {
        Long levelId = Long.parseLong(payload.getLevelId());
        DreamLevel level = dreamLevelRepository.findByIdAndOperationId(levelId, operation.getId())
                .orElseThrow(() -> new RequestException("Уровень сна не найден"));

        scenario.setName(payload.getName().trim());
        scenario.setLevel(level);
        scenario.setDescription(payload.getDescription() != null ? payload.getDescription().trim() : "");
        scenario.setTriggerText(payload.getTrigger().trim());
        scenario.setExpectedResult(payload.getExpectedResult().trim());
        scenario.getParticipants().clear();
        scenario.getParticipants().addAll(resolveParticipants(operation.getId(), payload.getParticipantIds()));
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

    private void ensureScenariosEditable(InceptionOperation operation, OperationPlanning planning, UserPrincipal principal) {
        if (operation.getStatus() != OperationStatus.planning) {
            throw new RequestException("Редактирование доступно только в статусе «Планирование»");
        }
        if (planning.isScenariosFixed()) {
            throw new RequestException("Сценарии уже зафиксированы");
        }
        accessService.requirePrivilege(principal, "INCEPTION_MANAGE_SCENARIOS");
    }

    private OperationPlanning loadPlanning(InceptionOperation operation) {
        return planningRepository.findByOperationId(operation.getId())
                .orElseThrow(() -> new RequestException("Данные планирования не найдены"));
    }
}
