package com.inception.api.controller;

import com.inception.auth.security.UserPrincipal;
import com.inception.events.dto.CreateEventPayload;
import com.inception.events.dto.EventResponse;
import com.inception.events.service.OperationEventService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/operations/{operationId}/events")
public class OperationEventController {

    private final OperationEventService eventService;

    public OperationEventController(OperationEventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public List<EventResponse> list(
            @PathVariable Long operationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return eventService.list(operationId, principal);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventResponse create(
            @PathVariable Long operationId,
            @Valid @RequestBody CreateEventPayload payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return eventService.create(operationId, payload, principal);
    }
}
