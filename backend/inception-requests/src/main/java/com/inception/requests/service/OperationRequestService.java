package com.inception.requests.service;

import com.inception.auth.entity.AppUser;
import com.inception.auth.repository.AppUserRepository;
import com.inception.auth.security.UserPrincipal;
import com.inception.requests.dto.OrganizerResponse;
import com.inception.requests.dto.RejectRequestPayload;
import com.inception.requests.dto.RequestPayload;
import com.inception.requests.dto.RequestResponse;
import com.inception.requests.dto.UserLookupResponse;
import com.inception.core.entity.NotificationType;
import com.inception.requests.entity.OperationRequest;
import com.inception.requests.entity.RequestStatus;
import com.inception.core.exception.RequestException;
import com.inception.requests.mapper.RequestMapper;
import com.inception.requests.repository.OperationRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OperationRequestService {

    private final OperationRequestRepository requestRepository;
    private final AppUserRepository appUserRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<RequestResponse> list(UserPrincipal principal) {
        if (hasPrivilege(principal, "INCEPTION_VIEW_OWN_REQUESTS")) {
            return requestRepository.findByCustomerIdOrderByUpdatedAtDesc(principal.getId()).stream()
                    .map(RequestMapper::toResponse)
                    .toList();
        }
        if (hasPrivilege(principal, "INCEPTION_REVIEW_REQUEST")) {
            return requestRepository.findByOrganizerIdOrderByUpdatedAtDesc(principal.getId()).stream()
                    .map(RequestMapper::toResponse)
                    .toList();
        }
        throw new RequestException("Недостаточно прав для просмотра заявок");
    }

    @Transactional(readOnly = true)
    public RequestResponse getById(Long id, UserPrincipal principal) {
        OperationRequest request = loadAccessibleRequest(id, principal);
        return RequestMapper.toResponse(request);
    }

    @Transactional
    public RequestResponse create(RequestPayload payload, UserPrincipal principal, boolean submit) {
        requirePrivilege(principal, "INCEPTION_CREATE_REQUEST");

        AppUser customer = loadUser(principal.getId());
        OperationRequest request = new OperationRequest();
        request.setCustomer(customer);
        RequestMapper.applyPayload(request, payload);
        resolveOrganizer(request, payload.getOrganizerLogin());

        if (submit) {
            validateForSubmit(request);
            request.setStatus(RequestStatus.pending);
            request.setSubmittedAt(Instant.now());
        } else {
            request.setStatus(RequestStatus.draft);
        }

        OperationRequest saved = requestRepository.save(request);
        if (saved.getStatus() == RequestStatus.pending) {
            notifyOrganizerNewRequest(saved);
        }

        return RequestMapper.toResponse(saved);
    }

    @Transactional
    public RequestResponse update(Long id, RequestPayload payload, UserPrincipal principal) {
        requirePrivilege(principal, "INCEPTION_EDIT_REQUEST");

        OperationRequest request = requestRepository.findDetailedById(id)
                .orElseThrow(() -> new RequestException("Заявка не найдена"));

        if (!request.getCustomer().getId().equals(principal.getId())) {
            throw new RequestException("Недостаточно прав для редактирования заявки");
        }
        if (request.getStatus() != RequestStatus.draft && request.getStatus() != RequestStatus.pending) {
            throw new RequestException("Редактирование доступно только для черновиков и заявок на рассмотрении");
        }

        RequestMapper.applyPayload(request, payload);
        if (payload.getOrganizerLogin() != null) {
            resolveOrganizer(request, payload.getOrganizerLogin());
        }

        return RequestMapper.toResponse(requestRepository.save(request));
    }

    @Transactional
    public RequestResponse submit(Long id, UserPrincipal principal) {
        requirePrivilege(principal, "INCEPTION_SUBMIT_REQUEST");

        OperationRequest request = requestRepository.findDetailedById(id)
                .orElseThrow(() -> new RequestException("Заявка не найдена"));

        if (!request.getCustomer().getId().equals(principal.getId())) {
            throw new RequestException("Недостаточно прав для отправки заявки");
        }
        if (request.getStatus() != RequestStatus.draft) {
            throw new RequestException("Отправить можно только черновик");
        }

        validateForSubmit(request);
        request.setStatus(RequestStatus.pending);
        request.setSubmittedAt(Instant.now());

        OperationRequest saved = requestRepository.save(request);
        notifyOrganizerNewRequest(saved);

        return RequestMapper.toResponse(saved);
    }

    @Transactional
    public void delete(Long id, UserPrincipal principal) {
        requirePrivilege(principal, "INCEPTION_EDIT_REQUEST");

        OperationRequest request = requestRepository.findDetailedById(id)
                .orElseThrow(() -> new RequestException("Заявка не найдена"));

        if (!request.getCustomer().getId().equals(principal.getId())) {
            throw new RequestException("Недостаточно прав для удаления заявки");
        }
        if (request.getStatus() != RequestStatus.draft && request.getStatus() != RequestStatus.pending) {
            throw new RequestException("Удаление доступно только для черновиков и заявок на рассмотрении");
        }

        requestRepository.delete(request);
    }

    @Transactional
    public RequestResponse reject(Long id, RejectRequestPayload payload, UserPrincipal principal) {
        requirePrivilege(principal, "INCEPTION_REJECT_REQUEST");

        OperationRequest request = requestRepository.findDetailedById(id)
                .orElseThrow(() -> new RequestException("Заявка не найдена"));

        if (request.getOrganizer() == null || !request.getOrganizer().getId().equals(principal.getId())) {
            throw new RequestException("Заявка не назначена вам");
        }
        if (request.getStatus() != RequestStatus.pending) {
            throw new RequestException("Отклонить можно только заявку на рассмотрении");
        }

        request.setStatus(RequestStatus.rejected);
        request.setRejectionReason(payload.getRejectionReason().trim());

        OperationRequest saved = requestRepository.save(request);
        notificationService.notifyUser(
                saved.getCustomer(),
                NotificationType.request_rejected,
                "Заявка отклонена",
                "Организатор @" + principal.getUsername()
                        + " отклонил заявку «" + saved.getName() + "». Причина: "
                        + saved.getRejectionReason(),
                "request",
                saved.getId()
        );

        return RequestMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<OrganizerResponse> listOrganizers() {
        return appUserRepository.findByRole_CodeIgnoreCaseAndEnabledTrue("organizer").stream()
                .map(user -> OrganizerResponse.builder()
                        .login(user.getLogin())
                        .fullName(user.getFullName())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public UserLookupResponse lookupUser(String login, UserPrincipal principal) {
        if (principal == null) {
            throw new RequestException("Требуется авторизация");
        }
        if (!hasPrivilege(principal, "INCEPTION_MANAGE_PARTICIPANTS")
                && !hasPrivilege(principal, "INCEPTION_CONFIRM_REQUEST")) {
            throw new RequestException("Недостаточно прав");
        }

        String normalizedLogin = login == null ? "" : login.trim();
        if (normalizedLogin.isEmpty()) {
            throw new RequestException("Введите логин участника");
        }

        AppUser user = appUserRepository.findByLoginIgnoreCase(normalizedLogin)
                .filter(AppUser::isEnabled)
                .orElseThrow(() -> new RequestException(
                        "Пользователь @" + normalizedLogin + " не зарегистрирован в системе"
                ));

        return UserLookupResponse.builder()
                .login(user.getLogin())
                .fullName(user.getFullName())
                .role(user.getRole().getCode())
                .build();
    }

    private void notifyOrganizerNewRequest(OperationRequest request) {
        if (request.getOrganizer() == null) {
            return;
        }
        notificationService.notifyUser(
                request.getOrganizer(),
                NotificationType.request_submitted,
                "Новая заявка",
                "Заказчик @" + request.getCustomer().getLogin()
                        + " отправил заявку «" + request.getName() + "» на рассмотрение",
                "request",
                request.getId()
        );
    }

    private OperationRequest loadRequest(Long id) {
        return requestRepository.findDetailedById(id)
                .orElseThrow(() -> new RequestException("Заявка не найдена"));
    }

    private OperationRequest loadAccessibleRequest(Long id, UserPrincipal principal) {
        OperationRequest request = loadRequest(id);

        boolean isCustomer = request.getCustomer().getId().equals(principal.getId())
                && hasPrivilege(principal, "INCEPTION_VIEW_OWN_REQUESTS");
        boolean isOrganizer = request.getOrganizer() != null
                && request.getOrganizer().getId().equals(principal.getId())
                && hasPrivilege(principal, "INCEPTION_REVIEW_REQUEST");

        if (!isCustomer && !isOrganizer) {
            throw new RequestException("Недостаточно прав для просмотра заявки");
        }

        return request;
    }

    private AppUser loadUser(Long id) {
        return appUserRepository.findById(id)
                .orElseThrow(() -> new RequestException("Пользователь не найден"));
    }

    private void resolveOrganizer(OperationRequest request, String organizerLogin) {
        if (organizerLogin == null || organizerLogin.isBlank()) {
            request.setOrganizer(null);
            return;
        }

        AppUser organizer = appUserRepository
                .findByLoginIgnoreCaseAndRole_CodeIgnoreCaseAndEnabledTrue(organizerLogin.trim(), "organizer")
                .orElseThrow(() -> new RequestException("Организатор с таким логином не найден в системе"));

        request.setOrganizer(organizer);
    }

    private void validateForSubmit(OperationRequest request) {
        List<String> errors = new ArrayList<>();
        if (isBlank(request.getName())) {
            errors.add("Введите название операции");
        }
        if (isBlank(request.getDescription())) {
            errors.add("Введите краткое описание");
        }
        if (request.getPlannedDate() == null) {
            errors.add("Укажите предполагаемую дату");
        }
        if (isBlank(request.getTargetFullName())) {
            errors.add("Введите ФИО объекта");
        }
        if (request.getTargetBirthDate() == null) {
            errors.add("Укажите дату рождения объекта");
        }
        if (isBlank(request.getTargetDescription())) {
            errors.add("Введите краткую характеристику объекта");
        }
        if (request.getGoal() == null) {
            errors.add("Выберите цель операции");
        }
        if (isBlank(request.getDesiredResult())) {
            errors.add("Опишите желаемый результат");
        }
        if (isBlank(request.getSuccessCriteria())) {
            errors.add("Укажите критерии успеха");
        }
        if (isBlank(request.getOrganization())) {
            errors.add("Укажите организацию");
        }
        if (request.getOrganizer() == null) {
            errors.add("Укажите логин организатора");
        }
        if (!errors.isEmpty()) {
            throw new RequestException(String.join("; ", errors));
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
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
