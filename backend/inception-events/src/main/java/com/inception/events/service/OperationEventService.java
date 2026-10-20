package com.inception.events.service;

import com.inception.auth.security.UserPrincipal;
import com.inception.core.entity.InceptionOperation;
import com.inception.core.exception.RequestException;
import com.inception.core.service.OperationAccessService;
import com.inception.events.dto.CreateEventPayload;
import com.inception.events.dto.EventResponse;
import com.inception.events.entity.OperationEvent;
import com.inception.events.mapper.EventMapper;
import com.inception.core.repository.InceptionOperationRepository;
import com.inception.events.repository.OperationEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OperationEventService {

    private final OperationEventRepository eventRepository;
    private final InceptionOperationRepository operationRepository;
    private final OperationAccessService accessService;

    @Transactional(readOnly = true)
    public List<EventResponse> list(Long operationId, UserPrincipal principal) {
        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);
        accessService.requirePrivilege(principal, "INCEPTION_VIEW_EVENT_LOG");

        return eventRepository.findByOperationIdOrderByCreatedAtDesc(operation.getId()).stream()
                .map(EventMapper::toResponse)
                .toList();
    }

    @Transactional
    public EventResponse create(Long operationId, CreateEventPayload payload, UserPrincipal principal) {
        if (principal == null) {
            throw new RequestException("Требуется авторизация");
        }

        InceptionOperation operation = accessService.loadOperationForView(operationId, principal);

        return EventMapper.toResponse(recordEvent(
                operation,
                principal.getUsername(),
                payload.getAction().trim(),
                payload.getDetails().trim()
        ));
    }

    @Transactional
    public OperationEvent recordEvent(InceptionOperation operation, String actorLogin, String action, String details) {
        OperationEvent event = new OperationEvent();
        event.setOperation(operation);
        event.setActorLogin(actorLogin);
        event.setAction(action);
        event.setDetails(details);
        return eventRepository.save(event);
    }

    @Transactional
    public void recordEvent(Long operationId, String actorLogin, String action, String details) {
        InceptionOperation operation = operationRepository.findById(operationId)
                .orElseThrow(() -> new RequestException("Операция не найдена"));
        recordEvent(operation, actorLogin, action, details);
    }
}
