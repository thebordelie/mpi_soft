package com.inception.monitoring.service;

import com.inception.auth.entity.AppUser;
import com.inception.auth.repository.AppUserRepository;
import com.inception.auth.security.UserPrincipal;
import com.inception.core.dto.OperationResponse;
import com.inception.core.entity.InceptionOperation;
import com.inception.core.entity.NotificationType;
import com.inception.core.entity.OperationParticipant;
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
import com.inception.monitoring.dto.LaunchResultResponse;
import com.inception.monitoring.dto.LaunchStateResponse;
import com.inception.monitoring.dto.ParticipantSedationSummary;
import com.inception.monitoring.dto.PasivConnectionResponse;
import com.inception.monitoring.dto.RejectSedationPayload;
import com.inception.monitoring.entity.OperationLaunch;
import com.inception.monitoring.entity.PasivChannelStatus;
import com.inception.monitoring.entity.PasivConnection;
import com.inception.monitoring.entity.PasivConnectionStatus;
import com.inception.monitoring.entity.SedationReadiness;
import com.inception.monitoring.repository.OperationLaunchRepository;
import com.inception.monitoring.repository.PasivConnectionRepository;
import com.inception.sedation.entity.SedationConfig;
import com.inception.sedation.repository.SedationConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OperationLaunchService {

    private final InceptionOperationRepository operationRepository;
    private final OperationLaunchRepository launchRepository;
    private final PasivConnectionRepository pasivConnectionRepository;
    private final OperationParticipantRepository participantRepository;
    private final OperationPlanningRepository planningRepository;
    private final SedationConfigRepository sedationConfigRepository;
    private final AppUserRepository appUserRepository;
    private final OperationEventService eventService;
    private final OperationNotifier notifier;
    private final OperationAccessService accessService;

    @Transactional(readOnly = true)
    public LaunchStateResponse getLaunchState(Long operationId, UserPrincipal principal) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        OperationLaunch launch = ensureLaunchSession(operation);
        syncPasivConnections(operation);
        return buildLaunchState(operation, launch, principal);
    }

    @Transactional
    public void initLaunchSession(InceptionOperation operation) {
        if (launchRepository.findByOperationId(operation.getId()).isPresent()) {
            return;
        }
        OperationLaunch launch = new OperationLaunch();
        launch.setOperation(operation);
        launchRepository.save(launch);
        syncPasivConnections(operation);
    }

    @Transactional
    public void resetLaunchSession(InceptionOperation operation) {
        launchRepository.findByOperationId(operation.getId()).ifPresent(launch -> {
            launch.setCurrentStep(0);
            launch.setSedationReadiness(SedationReadiness.pending);
            launch.setSedationRejectionReason(null);
            launch.setSedationConfirmedAt(null);
            launch.setSedationConfirmedBy(null);
            launch.setLaunchedAt(null);
            launch.setLaunchedBy(null);
            launchRepository.save(launch);
        });
        for (PasivConnection connection : pasivConnectionRepository.findByOperationIdOrderByIdAsc(operation.getId())) {
            connection.setConnectionStatus(PasivConnectionStatus.disconnected);
            connection.setChannelStatus(PasivChannelStatus.offline);
            connection.setSedationActive(false);
            pasivConnectionRepository.save(connection);
        }
    }

    @Transactional
    public OperationResponse beginLaunch(Long operationId, UserPrincipal principal) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        accessService.requireOrganizerOwner(operation, principal);
        accessService.requirePrivilege(principal, "INCEPTION_LAUNCH_OPERATION");

        if (operation.getStatus() != OperationStatus.ready) {
            throw new RequestException("Подготовить к запуску можно только операцию в статусе «Готова к запуску»");
        }

        initLaunchSession(operation);
        operation.setStatus(OperationStatus.launch);
        InceptionOperation saved = operationRepository.save(operation);

        eventService.recordEvent(saved, principal.getUsername(),
                "Подготовка к запуску",
                "Организатор @" + principal.getUsername()
                        + " начал подготовку к запуску операции «" + saved.getName() + "»");
        notifyParticipants(saved, "Подготовка к запуску",
                "Операция «" + saved.getName() + "» переведена в режим запуска. Химик подключает участников к PASIV.");

        return toOperationResponse(saved);
    }

    @Transactional
    public PasivConnectionResponse connectPasiv(Long operationId, Long participantId, UserPrincipal principal) {
        InceptionOperation operation = loadOperationForLaunch(operationId, principal);
        requirePasivManagement(operation, principal);
        ensureLaunchSession(operation);

        PasivConnection connection = pasivConnectionRepository
                .findByOperationIdAndParticipantId(operationId, participantId)
                .orElseThrow(() -> new RequestException("Подключение PASIV не найдено"));

        if (connection.getConnectionStatus() == PasivConnectionStatus.connected) {
            throw new RequestException("Участник уже подключён");
        }

        connection.setConnectionStatus(PasivConnectionStatus.connected);
        connection.setChannelStatus(PasivChannelStatus.stable);
        connection.setSedationActive(true);
        pasivConnectionRepository.save(connection);

        eventService.recordEvent(operation, principal.getUsername(),
                "Подключение PASIV",
                "Участник @" + connection.getParticipant().getUser().getLogin()
                        + " подключён к устройству PASIV");

        return toPasivResponse(connection, sedationLevelNames(operationId));
    }

    @Transactional
    public PasivConnectionResponse disconnectPasiv(Long operationId, Long participantId, UserPrincipal principal) {
        InceptionOperation operation = loadOperationForLaunch(operationId, principal);
        requirePasivManagement(operation, principal);
        ensureLaunchSession(operation);

        PasivConnection connection = pasivConnectionRepository
                .findByOperationIdAndParticipantId(operationId, participantId)
                .orElseThrow(() -> new RequestException("Подключение PASIV не найдено"));

        connection.setConnectionStatus(PasivConnectionStatus.disconnected);
        connection.setChannelStatus(PasivChannelStatus.offline);
        connection.setSedationActive(false);
        pasivConnectionRepository.save(connection);

        eventService.recordEvent(operation, principal.getUsername(),
                "Отключение PASIV",
                "Участник @" + connection.getParticipant().getUser().getLogin()
                        + " отключён от устройства PASIV");

        return toPasivResponse(connection, sedationLevelNames(operationId));
    }

    @Transactional
    public LaunchStateResponse advanceStep(Long operationId, UserPrincipal principal) {
        InceptionOperation operation = loadOperationForLaunch(operationId, principal);
        requirePasivManagement(operation, principal);
        OperationLaunch launch = ensureLaunchSession(operation);

        if (launch.getCurrentStep() != 0) {
            throw new RequestException("Переход к подтверждению доступен только на шаге мониторинга PASIV");
        }
        if (!allParticipantsConnected(operationId)) {
            throw new RequestException("Подключите всех участников к PASIV");
        }

        launch.setCurrentStep(1);
        launchRepository.save(launch);

        eventService.recordEvent(operation, principal.getUsername(),
                "Подтверждение готовности",
                "Все участники подключены к PASIV — переход к подтверждению готовности к седации");

        return buildLaunchState(operation, launch, principal);
    }

    @Transactional
    public LaunchStateResponse confirmSedation(Long operationId, UserPrincipal principal) {
        InceptionOperation operation = loadOperationForLaunch(operationId, principal);
        requireChemist(operation, principal);
        accessService.requirePrivilege(principal, "INCEPTION_CONFIRM_PASIV_READINESS");
        OperationLaunch launch = ensureLaunchSession(operation);

        if (launch.getCurrentStep() < 1) {
            throw new RequestException("Сначала завершите мониторинг PASIV");
        }
        if (launch.getSedationReadiness() == SedationReadiness.confirmed) {
            return buildLaunchState(operation, launch, principal);
        }

        AppUser chemist = appUserRepository.findById(principal.getId())
                .orElseThrow(() -> new RequestException("Пользователь не найден"));
        launch.setSedationReadiness(SedationReadiness.confirmed);
        launch.setSedationRejectionReason(null);
        launch.setSedationConfirmedAt(Instant.now());
        launch.setSedationConfirmedBy(chemist);
        launchRepository.save(launch);

        eventService.recordEvent(operation, principal.getUsername(),
                "Готовность к седации",
                "Химик @" + principal.getUsername()
                        + " подтвердил готовность к седации для операции «" + operation.getName() + "»");
        notifyParticipants(operation, "Готовность к седации подтверждена",
                "Химик подтвердил готовность к седации для операции «" + operation.getName() + "»");

        return buildLaunchState(operation, launch, principal);
    }

    @Transactional
    public LaunchResultResponse rejectSedation(
            Long operationId,
            RejectSedationPayload payload,
            UserPrincipal principal
    ) {
        InceptionOperation operation = loadOperationForLaunch(operationId, principal);
        requireChemist(operation, principal);
        accessService.requirePrivilege(principal, "INCEPTION_CONFIRM_PASIV_READINESS");
        OperationLaunch launch = ensureLaunchSession(operation);
        OperationPlanning planning = loadPlanning(operation);

        String reason = payload.getRejectionReason().trim();
        launch.setSedationReadiness(SedationReadiness.rejected);
        launch.setSedationRejectionReason(reason);
        launchRepository.save(launch);

        operation.setStatus(OperationStatus.planning);
        planning.setSedationFixedAt(null);
        planning.setSedationFixedBy(null);
        operationRepository.save(operation);
        planningRepository.save(planning);
        resetLaunchSession(operation);

        eventService.recordEvent(operation, principal.getUsername(),
                "Отклонение готовности к седации",
                "Химик @" + principal.getUsername()
                        + " отклонил готовность к седации: " + reason);
        notifyParticipants(operation, "Возврат на планирование",
                "Готовность к седации отклонена. Операция «" + operation.getName()
                        + "» возвращена на этап планирования");

        InceptionOperation saved = operationRepository.findDetailedById(operationId)
                .orElseThrow(() -> new RequestException("Операция не найдена"));
        return LaunchResultResponse.builder()
                .operation(toOperationResponse(saved))
                .build();
    }

    @Transactional
    public LaunchResultResponse executeLaunch(Long operationId, UserPrincipal principal) {
        InceptionOperation operation = loadOperationForLaunch(operationId, principal);
        accessService.requireOrganizerOwner(operation, principal);
        accessService.requirePrivilege(principal, "INCEPTION_LAUNCH_OPERATION");
        OperationLaunch launch = ensureLaunchSession(operation);

        if (operation.getStatus() == OperationStatus.running) {
            return LaunchResultResponse.builder()
                    .operation(toOperationResponse(operation))
                    .launch(buildLaunchState(operation, launch, principal))
                    .build();
        }
        if (operation.getStatus() != OperationStatus.launch) {
            throw new RequestException("Запуск доступен только для операции в статусе «Запуск»");
        }
        if (launch.getCurrentStep() < 1) {
            throw new RequestException("Сначала завершите мониторинг PASIV");
        }
        if (!allParticipantsConnected(operationId)) {
            throw new RequestException("Не все участники подключены к PASIV");
        }
        if (launch.getSedationReadiness() != SedationReadiness.confirmed) {
            throw new RequestException("Химик должен подтвердить готовность к седации");
        }

        AppUser organizer = appUserRepository.findById(principal.getId())
                .orElseThrow(() -> new RequestException("Пользователь не найден"));
        Instant now = Instant.now();
        launch.setLaunchedAt(now);
        launch.setLaunchedBy(organizer);
        launch.setCurrentStep(2);
        launchRepository.save(launch);

        operation.setStatus(OperationStatus.running);
        InceptionOperation saved = operationRepository.save(operation);

        eventService.recordEvent(saved, principal.getUsername(),
                "Запуск операции",
                "Организатор @" + principal.getUsername()
                        + " запустил операцию «" + saved.getName() + "»");
        notifyParticipants(saved, "Операция запущена",
                "Операция «" + saved.getName() + "» переведена в статус «Во сне»");

        return LaunchResultResponse.builder()
                .operation(toOperationResponse(saved))
                .launch(buildLaunchState(saved, launch, principal))
                .build();
    }

    @Transactional
    public LaunchResultResponse completeOperation(Long operationId, UserPrincipal principal) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        accessService.requireOrganizerOwner(operation, principal);
        accessService.requirePrivilege(principal, "INCEPTION_LAUNCH_OPERATION");

        if (operation.getStatus() != OperationStatus.running) {
            throw new RequestException("Завершить можно только операцию в статусе «Активна»");
        }

        OperationLaunch launch = ensureLaunchSession(operation);
        operation.setStatus(OperationStatus.completed);
        InceptionOperation saved = operationRepository.save(operation);

        eventService.recordEvent(saved, principal.getUsername(),
                "Завершение операции",
                "Организатор @" + principal.getUsername()
                        + " завершил операцию «" + saved.getName() + "»");
        notifyParticipants(saved, "Операция завершена",
                "Операция «" + saved.getName() + "» переведена в статус «Завершена»");

        return LaunchResultResponse.builder()
                .operation(toOperationResponse(saved))
                .launch(buildLaunchState(saved, launch, principal))
                .build();
    }

    private void syncPasivConnections(InceptionOperation operation) {
        List<OperationParticipant> participants = participantRepository.findByOperationId(operation.getId());
        Set<Long> existing = pasivConnectionRepository.findByOperationIdOrderByIdAsc(operation.getId()).stream()
                .map(c -> c.getParticipant().getId())
                .collect(Collectors.toSet());

        for (OperationParticipant participant : participants) {
            if (!existing.contains(participant.getId())) {
                PasivConnection connection = new PasivConnection();
                connection.setOperation(operation);
                connection.setParticipant(participant);
                pasivConnectionRepository.save(connection);
            }
        }
    }

    private OperationLaunch ensureLaunchSession(InceptionOperation operation) {
        return launchRepository.findByOperationId(operation.getId())
                .orElseGet(() -> {
                    if (operation.getStatus() == OperationStatus.running) {
                        OperationLaunch launch = new OperationLaunch();
                        launch.setOperation(operation);
                        launch.setCurrentStep(2);
                        launch.setSedationReadiness(SedationReadiness.confirmed);
                        return launchRepository.save(launch);
                    }
                    if (operation.getStatus() == OperationStatus.ready
                            || operation.getStatus() == OperationStatus.launch) {
                        initLaunchSession(operation);
                        return launchRepository.findByOperationId(operation.getId())
                                .orElseThrow(() -> new RequestException("Сессия запуска не найдена"));
                    }
                    throw new RequestException("Сессия запуска недоступна для текущего статуса операции");
                });
    }

    private LaunchStateResponse buildLaunchState(
            InceptionOperation operation,
            OperationLaunch launch,
            UserPrincipal principal
    ) {
        Long operationId = operation.getId();
        List<PasivConnection> connections = pasivConnectionRepository.findByOperationIdOrderByIdAsc(operationId);
        Map<Long, String> levelNames = sedationLevelNames(operationId);
        boolean allConnected = !connections.isEmpty() && connections.stream()
                .allMatch(c -> c.getConnectionStatus() == PasivConnectionStatus.connected);
        boolean isOrganizer = accessService.isOrganizerOwner(operation, principal)
                && accessService.hasPrivilege(principal, "INCEPTION_LAUNCH_OPERATION");
        boolean isChemist = accessService.hasParticipantRole(operationId, principal.getId(), ParticipantRole.chemist)
                && accessService.hasPrivilege(principal, "INCEPTION_CONFIRM_PASIV_READINESS");
        boolean launchPhase = operation.getStatus() == OperationStatus.launch
                || operation.getStatus() == OperationStatus.running;
        int step = operation.getStatus() == OperationStatus.running ? 2 : launch.getCurrentStep();

        return LaunchStateResponse.builder()
                .currentStep(step)
                .sedationReadiness(launch.getSedationReadiness())
                .sedationRejectionReason(launch.getSedationRejectionReason())
                .launchedAt(launch.getLaunchedAt() != null ? launch.getLaunchedAt().toString() : null)
                .allConnected(allConnected)
                .canAdvanceToConfirm(launchPhase && step == 0 && allConnected && isChemist)
                .canConfirmSedation(launchPhase && step >= 1
                        && launch.getSedationReadiness() != SedationReadiness.confirmed
                        && isChemist)
                .canLaunch(launchPhase && step >= 1
                        && launch.getSedationReadiness() == SedationReadiness.confirmed
                        && allConnected && isOrganizer
                        && operation.getStatus() == OperationStatus.launch)
                .canManagePasiv(launchPhase && step < 2 && isChemist)
                .pasivConnections(connections.stream()
                        .map(c -> toPasivResponse(c, levelNames))
                        .toList())
                .sedationSummaries(buildSedationSummaries(operationId))
                .build();
    }

    private List<ParticipantSedationSummary> buildSedationSummaries(Long operationId) {
        return sedationConfigRepository.findByOperationIdOrderByIdAsc(operationId).stream()
                .map(this::toSedationSummary)
                .toList();
    }

    private ParticipantSedationSummary toSedationSummary(SedationConfig config) {
        return ParticipantSedationSummary.builder()
                .participantId(String.valueOf(config.getParticipant().getId()))
                .participantName(config.getParticipant().getUser().getFullName())
                .participantRole(config.getParticipant().getRole().name())
                .compound(config.getCompound())
                .dosage(config.getDosage().stripTrailingZeros().toPlainString() + " мг")
                .durationHours(config.getDurationHours().stripTrailingZeros().toPlainString() + " ч")
                .method(config.getMethod())
                .levelName(config.getLevel().getName())
                .build();
    }

    private PasivConnectionResponse toPasivResponse(PasivConnection connection, Map<Long, String> levelNames) {
        OperationParticipant participant = connection.getParticipant();
        return PasivConnectionResponse.builder()
                .id(String.valueOf(connection.getId()))
                .participantId(String.valueOf(participant.getId()))
                .participantLogin(participant.getUser().getLogin())
                .participantName(participant.getUser().getFullName())
                .participantRole(participant.getRole().name())
                .connectionStatus(connection.getConnectionStatus())
                .channelStatus(connection.getChannelStatus())
                .sedationActive(connection.isSedationActive())
                .levelName(levelNames.getOrDefault(participant.getId(), ""))
                .build();
    }

    private Map<Long, String> sedationLevelNames(Long operationId) {
        Map<Long, String> result = new HashMap<>();
        for (SedationConfig config : sedationConfigRepository.findByOperationIdOrderByIdAsc(operationId)) {
            result.put(config.getParticipant().getId(), config.getLevel().getName());
        }
        return result;
    }

    private boolean allParticipantsConnected(Long operationId) {
        List<PasivConnection> connections = pasivConnectionRepository.findByOperationIdOrderByIdAsc(operationId);
        return !connections.isEmpty() && connections.stream()
                .allMatch(c -> c.getConnectionStatus() == PasivConnectionStatus.connected);
    }

    private InceptionOperation loadOperationForLaunch(Long operationId, UserPrincipal principal) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        if (operation.getStatus() != OperationStatus.launch && operation.getStatus() != OperationStatus.running) {
            throw new RequestException("Запуск доступен только для операций в статусе «Запуск» или «Активна»");
        }
        return operation;
    }

    private void requirePasivManagement(InceptionOperation operation, UserPrincipal principal) {
        requireChemist(operation, principal);
        accessService.requirePrivilege(principal, "INCEPTION_CONFIRM_PASIV_READINESS");
    }

    private void requireChemist(InceptionOperation operation, UserPrincipal principal) {
        if (!accessService.hasParticipantRole(operation.getId(), principal.getId(), ParticipantRole.chemist)) {
            throw new RequestException("Подтверждение доступно только химику операции");
        }
    }

    private OperationPlanning loadPlanning(InceptionOperation operation) {
        return planningRepository.findByOperationId(operation.getId())
                .orElseThrow(() -> new RequestException("Данные планирования не найдены"));
    }

    private OperationResponse toOperationResponse(InceptionOperation operation) {
        return OperationResponseMapper.toResponse(
                operation,
                participantRepository.findByOperationId(operation.getId())
        );
    }

    private void notifyParticipants(InceptionOperation operation, String title, String message) {
        notifier.notifyAllParticipants(
                operation,
                NotificationType.operation_participant_added,
                title,
                message
        );
    }
}
