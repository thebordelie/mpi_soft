package com.inception.requests.service;

import com.inception.architecture.dto.DreamLevelPayload;
import com.inception.architecture.dto.DreamLevelResponse;
import com.inception.architecture.service.DreamArchitectureService;
import com.inception.auth.security.UserPrincipal;
import com.inception.core.dto.ChangeStatusPayload;
import com.inception.core.dto.OperationResponse;
import com.inception.core.dto.PlanningStateResponse;
import com.inception.core.entity.InceptionOperation;
import com.inception.core.entity.NotificationType;
import com.inception.core.entity.OperationPlanning;
import com.inception.core.entity.OperationStatus;
import com.inception.core.entity.ParticipantRole;
import com.inception.core.exception.RequestException;
import com.inception.core.mapper.OperationResponseMapper;
import com.inception.core.notification.OperationNotifier;
import com.inception.core.repository.InceptionOperationRepository;
import com.inception.core.repository.OperationParticipantRepository;
import com.inception.core.repository.OperationPlanningRepository;
import com.inception.core.service.OperationAccessService;
import com.inception.events.service.OperationEventService;
import com.inception.monitoring.service.OperationLaunchService;
import com.inception.scenarios.dto.ScenarioPayload;
import com.inception.scenarios.dto.ScenarioResponse;
import com.inception.scenarios.service.ScenarioPlanningService;
import com.inception.sedation.dto.SedationConfigPayload;
import com.inception.sedation.dto.SedationConfigResponse;
import com.inception.sedation.service.SedationPlanningService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OperationPlanningService {

    private final InceptionOperationRepository operationRepository;
    private final OperationPlanningRepository planningRepository;
    private final OperationParticipantRepository participantRepository;
    private final OperationAccessService accessService;
    private final OperationEventService eventService;
    private final OperationNotifier notifier;
    private final OperationLaunchService launchService;
    private final DreamArchitectureService architectureService;
    private final SedationPlanningService sedationService;
    private final ScenarioPlanningService scenarioService;

    @Transactional(readOnly = true)
    public PlanningStateResponse getPlanningState(Long operationId, UserPrincipal principal) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        OperationPlanning planning = loadPlanning(operation);
        return buildPlanningState(operation, planning, principal);
    }

    @Transactional
    public OperationResponse changeStatus(Long operationId, ChangeStatusPayload payload, UserPrincipal principal) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        OperationPlanning planning = loadPlanning(operation);
        OperationStatus newStatus = parseStatus(payload.getStatus());
        OperationStatus current = operation.getStatus();

        if (newStatus == current) {
            return toOperationResponse(operation);
        }

        if (newStatus == OperationStatus.planning) {
            if (current == OperationStatus.active) {
                accessService.requireOrganizerOwner(operation, principal);
                accessService.requirePrivilege(principal, "INCEPTION_START_PLANNING");
                operation.setStatus(OperationStatus.planning);
                eventService.recordEvent(operation, principal.getUsername(),
                        "Начало планирования",
                        "Организатор @" + principal.getUsername()
                                + " перевёл операцию «" + operation.getName() + "» в статус «Планирование»");
                notifier.notifyAllParticipants(operation, NotificationType.operation_participant_added,
                        "Планирование начато",
                        "Операция «" + operation.getName() + "» переведена в режим планирования");
            } else if (current == OperationStatus.ready) {
                boolean isOrganizer = accessService.isOrganizerOwner(operation, principal)
                        && accessService.hasPrivilege(principal, "INCEPTION_FINALIZE_OPERATION");
                boolean isChemist = accessService.hasParticipantRole(operation.getId(), principal.getId(), ParticipantRole.chemist)
                        && accessService.hasPrivilege(principal, "INCEPTION_CONFIRM_PASIV_READINESS");
                if (!isOrganizer && !isChemist) {
                    throw new RequestException("Недостаточно прав для возврата на планирование");
                }
                operation.setStatus(OperationStatus.planning);
                planning.setSedationFixedAt(null);
                planning.setSedationFixedBy(null);
                launchService.resetLaunchSession(operation);
                eventService.recordEvent(operation, principal.getUsername(),
                        "Возврат на планирование",
                        "Операция «" + operation.getName() + "» возвращена на этап планирования");
            } else {
                throw new RequestException("Невозможно перевести операцию в планирование из текущего статуса");
            }
        } else if (newStatus == OperationStatus.ready) {
            if (current != OperationStatus.planning) {
                throw new RequestException("Зафиксировать можно только операцию в статусе «Планирование»");
            }
            accessService.requireOrganizerOwner(operation, principal);
            accessService.requirePrivilege(principal, "INCEPTION_FINALIZE_OPERATION");
            if (!planning.isFullyFixed()) {
                throw new RequestException("Зафиксируйте архитектуру сна, параметры седации и сценарии");
            }
            operation.setStatus(OperationStatus.ready);
            eventService.recordEvent(operation, principal.getUsername(),
                    "Фиксация операции",
                    "Операция «" + operation.getName() + "» переведена в статус «Готова к запуску»");
            notifier.notifyAllParticipants(operation, NotificationType.operation_participant_added,
                    "Операция готова к запуску",
                    "Планирование операции «" + operation.getName() + "» завершено");
            launchService.initLaunchSession(operation);
        } else {
            throw new RequestException("Недопустимый переход статуса");
        }

        InceptionOperation saved = operationRepository.save(operation);
        planningRepository.save(planning);
        return toOperationResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<DreamLevelResponse> listDreamLevels(Long operationId, UserPrincipal principal) {
        return architectureService.listDreamLevels(operationId, principal);
    }

    @Transactional
    public DreamLevelResponse createDreamLevel(Long operationId, DreamLevelPayload payload, UserPrincipal principal) {
        return architectureService.createDreamLevel(operationId, payload, principal);
    }

    @Transactional
    public DreamLevelResponse updateDreamLevel(
            Long operationId, Long levelId, DreamLevelPayload payload, UserPrincipal principal
    ) {
        return architectureService.updateDreamLevel(operationId, levelId, payload, principal);
    }

    @Transactional
    public void deleteDreamLevel(Long operationId, Long levelId, UserPrincipal principal) {
        architectureService.deleteDreamLevel(operationId, levelId, principal);
    }

    @Transactional
    public PlanningStateResponse fixArchitecture(Long operationId, UserPrincipal principal) {
        architectureService.fixArchitecture(operationId, principal);
        return getPlanningState(operationId, principal);
    }

    @Transactional(readOnly = true)
    public List<SedationConfigResponse> listSedationConfigs(Long operationId, UserPrincipal principal) {
        return sedationService.listSedationConfigs(operationId, principal);
    }

    @Transactional
    public SedationConfigResponse createSedationConfig(
            Long operationId, SedationConfigPayload payload, UserPrincipal principal
    ) {
        return sedationService.createSedationConfig(operationId, payload, principal);
    }

    @Transactional
    public SedationConfigResponse updateSedationConfig(
            Long operationId, Long configId, SedationConfigPayload payload, UserPrincipal principal
    ) {
        return sedationService.updateSedationConfig(operationId, configId, payload, principal);
    }

    @Transactional
    public void deleteSedationConfig(Long operationId, Long configId, UserPrincipal principal) {
        sedationService.deleteSedationConfig(operationId, configId, principal);
    }

    @Transactional
    public PlanningStateResponse fixSedation(Long operationId, UserPrincipal principal) {
        sedationService.fixSedation(operationId, principal);
        return getPlanningState(operationId, principal);
    }

    @Transactional(readOnly = true)
    public List<ScenarioResponse> listScenarios(Long operationId, UserPrincipal principal) {
        return scenarioService.listScenarios(operationId, principal);
    }

    @Transactional
    public ScenarioResponse createScenario(Long operationId, ScenarioPayload payload, UserPrincipal principal) {
        return scenarioService.createScenario(operationId, payload, principal);
    }

    @Transactional
    public ScenarioResponse updateScenario(
            Long operationId, Long scenarioId, ScenarioPayload payload, UserPrincipal principal
    ) {
        return scenarioService.updateScenario(operationId, scenarioId, payload, principal);
    }

    @Transactional
    public void deleteScenario(Long operationId, Long scenarioId, UserPrincipal principal) {
        scenarioService.deleteScenario(operationId, scenarioId, principal);
    }

    @Transactional
    public PlanningStateResponse fixScenarios(Long operationId, UserPrincipal principal) {
        scenarioService.fixScenarios(operationId, principal);
        return getPlanningState(operationId, principal);
    }

    @Transactional
    public void initPlanning(InceptionOperation operation) {
        if (planningRepository.findByOperationId(operation.getId()).isPresent()) {
            return;
        }
        OperationPlanning planning = new OperationPlanning();
        planning.setOperation(operation);
        planningRepository.save(planning);
    }

    private PlanningStateResponse buildPlanningState(
            InceptionOperation operation,
            OperationPlanning planning,
            UserPrincipal principal
    ) {
        boolean planningPhase = operation.getStatus() == OperationStatus.planning;
        return PlanningStateResponse.builder()
                .architectureFixed(planning.isArchitectureFixed())
                .sedationFixed(planning.isSedationFixed())
                .scenariosFixed(planning.isScenariosFixed())
                .canFinalize(planningPhase && planning.isFullyFixed()
                        && accessService.isOrganizerOwner(operation, principal)
                        && accessService.hasPrivilege(principal, "INCEPTION_FINALIZE_OPERATION"))
                .canEditArchitecture(planningPhase && !planning.isArchitectureFixed()
                        && accessService.hasPrivilege(principal, "INCEPTION_MANAGE_DREAM_ARCHITECTURE"))
                .canEditSedation(planningPhase && !planning.isSedationFixed()
                        && accessService.hasPrivilege(principal, "INCEPTION_MANAGE_SEDATION"))
                .canEditScenarios(planningPhase && !planning.isScenariosFixed()
                        && accessService.hasPrivilege(principal, "INCEPTION_MANAGE_SCENARIOS"))
                .build();
    }

    private OperationPlanning loadPlanning(InceptionOperation operation) {
        return planningRepository.findByOperationId(operation.getId())
                .orElseThrow(() -> new RequestException("Данные планирования не найдены"));
    }

    private OperationStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new RequestException("Укажите статус операции");
        }
        try {
            return OperationStatus.valueOf(status.trim().toLowerCase());
        } catch (IllegalArgumentException ex) {
            throw new RequestException("Указан недопустимый статус операции");
        }
    }

    private OperationResponse toOperationResponse(InceptionOperation operation) {
        return OperationResponseMapper.toResponse(
                operation,
                participantRepository.findByOperationId(operation.getId())
        );
    }
}
