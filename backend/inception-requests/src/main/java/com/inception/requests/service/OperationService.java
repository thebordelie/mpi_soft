package com.inception.requests.service;

import com.inception.auth.entity.AppUser;
import com.inception.auth.repository.AppUserRepository;
import com.inception.auth.security.UserPrincipal;
import com.inception.core.dto.OperationResponse;
import com.inception.core.entity.InceptionOperation;
import com.inception.core.entity.NotificationType;
import com.inception.core.entity.OperationParticipant;
import com.inception.core.entity.OperationStatus;
import com.inception.core.entity.ParticipantRole;
import com.inception.core.exception.RequestException;
import com.inception.core.repository.InceptionOperationRepository;
import com.inception.core.repository.OperationParticipantRepository;
import com.inception.events.service.OperationEventService;
import com.inception.requests.dto.ApproveRequestPayload;
import com.inception.requests.dto.ApproveResponse;
import com.inception.requests.dto.ParticipantPayload;
import com.inception.core.dto.ParticipantResponse;
import com.inception.requests.dto.UpdateOperationPayload;
import com.inception.requests.dto.UpdateParticipantPayload;
import com.inception.requests.entity.OperationRequest;
import com.inception.requests.entity.RequestStatus;
import com.inception.requests.mapper.OperationMapper;
import com.inception.requests.mapper.RequestMapper;
import com.inception.requests.repository.OperationRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class OperationService {

    private static final Map<ParticipantRole, String> ROLE_LABELS = Map.of(
            ParticipantRole.architect, "Архитектор",
            ParticipantRole.chemist, "Химик",
            ParticipantRole.impersonator, "Имперсонатор",
            ParticipantRole.extractor, "Извлекатель"
    );

    private final InceptionOperationRepository operationRepository;
    private final OperationParticipantRepository participantRepository;
    private final OperationRequestRepository requestRepository;
    private final AppUserRepository appUserRepository;
    private final OperationEventService eventService;
    private final NotificationService notificationService;
    private final OperationPlanningService planningService;

    @Transactional(readOnly = true)
    public List<OperationResponse> list(UserPrincipal principal) {
        if (principal == null) {
            throw new RequestException("Требуется авторизация");
        }

        List<InceptionOperation> operations = new ArrayList<>();
        Set<Long> seen = new HashSet<>();

        if (hasPrivilege(principal, "INCEPTION_VIEW_OPERATIONS")) {
            for (InceptionOperation operation : operationRepository.findByCreatedByIdOrderByUpdatedAtDesc(principal.getId())) {
                if (seen.add(operation.getId())) {
                    operations.add(operation);
                }
            }
        }

        if (hasPrivilege(principal, "INCEPTION_VIEW_ASSIGNED_OPERATIONS")) {
            for (InceptionOperation operation : operationRepository.findByParticipantUserId(principal.getId())) {
                if (seen.add(operation.getId())) {
                    operations.add(operation);
                }
            }
        }

        if (operations.isEmpty() && !hasPrivilege(principal, "INCEPTION_VIEW_OPERATIONS")
                && !hasPrivilege(principal, "INCEPTION_VIEW_ASSIGNED_OPERATIONS")) {
            throw new RequestException("Недостаточно прав для просмотра операций");
        }

        return operations.stream()
                .map(operation -> OperationMapper.toResponse(
                        operation,
                        participantRepository.findByOperationId(operation.getId())
                ))
                .toList();
    }

    @Transactional
    public OperationResponse update(Long operationId, UpdateOperationPayload payload, UserPrincipal principal) {
        InceptionOperation operation = loadOperationForEdit(operationId, principal);

        if (operation.getStatus() == OperationStatus.running
                || operation.getStatus() == OperationStatus.completed
                || operation.getStatus() == OperationStatus.cancelled) {
            throw new RequestException("Редактирование недоступно после запуска операции");
        }

        operation.setName(payload.getName().trim());
        operation.setTargetFullName(payload.getTargetFullName().trim());
        operation.setTargetBirthDate(RequestMapper.parseDate(payload.getTargetBirthDate()));
        operation.setTargetDescription(payload.getTargetDescription().trim());
        operation.setPlannedDate(RequestMapper.parseDate(payload.getPlannedDate()));
        operation.setSuccessCriteria(payload.getSuccessCriteria().trim());

        InceptionOperation saved = operationRepository.save(operation);

        eventService.recordEvent(
                saved,
                principal.getUsername(),
                "Изменение операции",
                "Организатор @" + principal.getUsername()
                        + " обновил данные операции «" + saved.getName() + "»"
        );

        return OperationMapper.toResponse(
                saved,
                participantRepository.findByOperationId(saved.getId())
        );
    }

    @Transactional
    public ApproveResponse approveFromRequest(Long requestId, ApproveRequestPayload payload, UserPrincipal principal) {
        if (principal == null) {
            throw new RequestException("Требуется авторизация");
        }
        requirePrivilege(principal, "INCEPTION_CONFIRM_REQUEST");

        OperationRequest request = requestRepository.findDetailedById(requestId)
                .orElseThrow(() -> new RequestException("Заявка не найдена"));

        if (request.getOrganizer() == null || !request.getOrganizer().getId().equals(principal.getId())) {
            throw new RequestException("Заявка не назначена вам");
        }
        if (request.getStatus() != RequestStatus.pending) {
            throw new RequestException("Одобрить можно только заявку на рассмотрении");
        }
        if (operationRepository.existsByRequestId(requestId)) {
            throw new RequestException("Операция по этой заявке уже создана");
        }

        AppUser organizer = appUserRepository.findById(principal.getId())
                .orElseThrow(() -> new RequestException("Пользователь не найден"));

        InceptionOperation operation = new InceptionOperation();
        operation.setRequestId(request.getId());
        operation.setName(request.getName());
        operation.setStatus(OperationStatus.active);
        operation.setTargetFullName(request.getTargetFullName());
        operation.setTargetBirthDate(request.getTargetBirthDate());
        operation.setTargetDescription(request.getTargetDescription());
        operation.setCustomerLogin(request.getCustomer().getLogin());
        operation.setCustomerCompany(request.getOrganization());
        operation.setPlannedDate(request.getPlannedDate());
        operation.setSuccessCriteria(request.getSuccessCriteria());
        operation.setCreatedBy(organizer);

        InceptionOperation savedOperation = operationRepository.save(operation);

        planningService.initPlanning(savedOperation);

        List<OperationParticipant> savedParticipants = new ArrayList<>();
        Set<String> addedLogins = new HashSet<>();

        for (ParticipantPayload participantPayload : payload.getParticipants()) {
            String login = participantPayload.getLogin() == null ? "" : participantPayload.getLogin().trim();
            if (login.isEmpty()) {
                throw new RequestException("Введите логин участника");
            }
            String loginKey = login.toLowerCase();
            if (!addedLogins.add(loginKey)) {
                throw new RequestException("Участник @" + login + " уже добавлен в команду");
            }

            ParticipantRole role = parseParticipantRole(participantPayload.getRole());

            AppUser user = appUserRepository.findByLoginIgnoreCase(login)
                    .filter(AppUser::isEnabled)
                    .orElseThrow(() -> new RequestException(
                            "Пользователь @" + login + " не зарегистрирован в системе"
                    ));

            OperationParticipant participant = new OperationParticipant();
            participant.setOperation(savedOperation);
            participant.setUser(user);
            participant.setRole(role);
            savedParticipants.add(participantRepository.save(participant));
        }

        request.setStatus(RequestStatus.approved);
        requestRepository.save(request);

        eventService.recordEvent(
                savedOperation,
                principal.getUsername(),
                "Создание операции",
                "Операция \"" + savedOperation.getName() + "\" создана по заявке"
        );
        for (OperationParticipant savedParticipant : savedParticipants) {
            eventService.recordEvent(
                    savedOperation,
                    principal.getUsername(),
                    "Добавление участника",
                    "Участник @" + savedParticipant.getUser().getLogin()
                            + " добавлен с ролью " + roleLabel(savedParticipant.getRole())
            );
        }

        notificationService.notifyUser(
                request.getCustomer(),
                NotificationType.request_approved,
                "Заявка одобрена",
                "Заявка «" + request.getName() + "» одобрена. Создана операция «"
                        + savedOperation.getName() + "».",
                "operation",
                savedOperation.getId()
        );
        for (OperationParticipant savedParticipant : savedParticipants) {
            notificationService.notifyUser(
                    savedParticipant.getUser(),
                    NotificationType.operation_participant_added,
                    "Назначение на операцию",
                    "Вы назначены на операцию «" + savedOperation.getName()
                            + "» с ролью " + roleLabel(savedParticipant.getRole()),
                    "operation",
                    savedOperation.getId()
            );
        }

        return ApproveResponse.builder()
                .request(RequestMapper.toResponse(request))
                .operation(OperationMapper.toResponse(savedOperation, savedParticipants))
                .build();
    }

    @Transactional(readOnly = true)
    public List<ParticipantResponse> listParticipants(Long operationId, UserPrincipal principal) {
        InceptionOperation operation = loadOperationForView(operationId, principal);
        return participantRepository.findByOperationId(operation.getId()).stream()
                .map(OperationMapper::toParticipantResponse)
                .toList();
    }

    @Transactional
    public ParticipantResponse addParticipant(Long operationId, ParticipantPayload payload, UserPrincipal principal) {
        InceptionOperation operation = loadOperationForManage(operationId, principal);

        String login = payload.getLogin() == null ? "" : payload.getLogin().trim();
        if (login.isEmpty()) {
            throw new RequestException("Введите логин участника");
        }

        ParticipantRole role = parseParticipantRole(payload.getRole());

        AppUser user = appUserRepository.findByLoginIgnoreCase(login)
                .filter(AppUser::isEnabled)
                .orElseThrow(() -> new RequestException(
                        "Пользователь @" + login + " не зарегистрирован в системе"
                ));

        if (participantRepository.existsByOperationIdAndUserId(operation.getId(), user.getId())) {
            throw new RequestException("Участник @" + login + " уже добавлен в команду");
        }

        OperationParticipant participant = new OperationParticipant();
        participant.setOperation(operation);
        participant.setUser(user);
        participant.setRole(role);

        OperationParticipant saved = participantRepository.save(participant);
        eventService.recordEvent(
                operation,
                principal.getUsername(),
                "Добавление участника",
                "Участник @" + user.getLogin() + " добавлен с ролью " + roleLabel(role)
        );
        if (!user.getId().equals(principal.getId())) {
            notificationService.notifyUser(
                    user,
                    NotificationType.operation_participant_added,
                    "Назначение на операцию",
                    "Вы назначены на операцию «" + operation.getName()
                            + "» с ролью " + roleLabel(role),
                    "operation",
                    operation.getId()
            );
        }

        return OperationMapper.toParticipantResponse(saved);
    }

    @Transactional
    public ParticipantResponse updateParticipantRole(
            Long operationId,
            Long participantId,
            UpdateParticipantPayload payload,
            UserPrincipal principal
    ) {
        loadOperationForManage(operationId, principal);

        OperationParticipant participant = participantRepository.findByIdAndOperationId(participantId, operationId)
                .orElseThrow(() -> new RequestException("Участник не найден"));

        ParticipantRole newRole = parseParticipantRole(payload.getRole());
        participant.setRole(newRole);

        OperationParticipant saved = participantRepository.save(participant);
        eventService.recordEvent(
                saved.getOperation(),
                principal.getUsername(),
                "Изменение роли участника",
                "Роль участника @" + saved.getUser().getLogin() + " изменена на " + roleLabel(newRole)
        );

        return OperationMapper.toParticipantResponse(saved);
    }

    @Transactional
    public void deleteParticipant(Long operationId, Long participantId, UserPrincipal principal) {
        loadOperationForManage(operationId, principal);

        OperationParticipant participant = participantRepository.findByIdAndOperationId(participantId, operationId)
                .orElseThrow(() -> new RequestException("Участник не найден"));

        InceptionOperation operation = participant.getOperation();
        String login = participant.getUser().getLogin();
        participantRepository.delete(participant);

        eventService.recordEvent(
                operation,
                principal.getUsername(),
                "Удаление участника",
                "Участник @" + login + " удалён из операции"
        );
    }

    private InceptionOperation loadOperationForView(Long operationId, UserPrincipal principal) {
        if (principal == null) {
            throw new RequestException("Требуется авторизация");
        }

        InceptionOperation operation = operationRepository.findDetailedById(operationId)
                .orElseThrow(() -> new RequestException("Операция не найдена"));

        boolean isOrganizer = operation.getCreatedBy().getId().equals(principal.getId())
                && hasPrivilege(principal, "INCEPTION_VIEW_OPERATIONS");
        boolean isParticipant = participantRepository.existsByOperationIdAndUserId(operationId, principal.getId())
                && hasPrivilege(principal, "INCEPTION_VIEW_ASSIGNED_OPERATIONS");

        if (!isOrganizer && !isParticipant) {
            throw new RequestException("Недостаточно прав для просмотра участников");
        }

        return operation;
    }

    private InceptionOperation loadOperationForEdit(Long operationId, UserPrincipal principal) {
        if (principal == null) {
            throw new RequestException("Требуется авторизация");
        }
        requirePrivilege(principal, "INCEPTION_EDIT_OPERATION");

        InceptionOperation operation = operationRepository.findDetailedById(operationId)
                .orElseThrow(() -> new RequestException("Операция не найдена"));

        if (!operation.getCreatedBy().getId().equals(principal.getId())) {
            throw new RequestException("Недостаточно прав для редактирования операции");
        }

        return operation;
    }

    private InceptionOperation loadOperationForManage(Long operationId, UserPrincipal principal) {
        if (principal == null) {
            throw new RequestException("Требуется авторизация");
        }
        requirePrivilege(principal, "INCEPTION_MANAGE_PARTICIPANTS");

        InceptionOperation operation = operationRepository.findDetailedById(operationId)
                .orElseThrow(() -> new RequestException("Операция не найдена"));

        if (!operation.getCreatedBy().getId().equals(principal.getId())) {
            throw new RequestException("Недостаточно прав для управления участниками");
        }

        return operation;
    }

    private ParticipantRole parseParticipantRole(String role) {
        if (role == null || role.isBlank()) {
            throw new RequestException("Выберите роль участника");
        }
        try {
            return ParticipantRole.valueOf(role.trim().toLowerCase());
        } catch (IllegalArgumentException ex) {
            throw new RequestException("Указана недопустимая роль участника");
        }
    }

    private String roleLabel(ParticipantRole role) {
        return ROLE_LABELS.getOrDefault(role, role.name());
    }

    private boolean hasPrivilege(UserPrincipal principal, String privilege) {
        return principal.getPrivileges().contains(privilege);
    }

    private void requirePrivilege(UserPrincipal principal, String privilege) {
        if (!hasPrivilege(principal, privilege)) {
            throw new RequestException("Недостаточно прав");
        }
    }
}
