package com.inception.api.controller;

import com.inception.auth.security.UserPrincipal;
import com.inception.requests.dto.ApproveRequestPayload;
import com.inception.requests.dto.ApproveResponse;
import com.inception.core.dto.OperationResponse;
import com.inception.requests.dto.ParticipantPayload;
import com.inception.core.dto.ParticipantResponse;
import com.inception.requests.dto.UpdateOperationPayload;
import com.inception.requests.dto.UpdateParticipantPayload;
import com.inception.requests.service.OperationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class OperationController {

    private final OperationService operationService;

    public OperationController(OperationService operationService) {
        this.operationService = operationService;
    }

    @GetMapping("/operations")
    public List<OperationResponse> list(@AuthenticationPrincipal UserPrincipal principal) {
        return operationService.list(principal);
    }

    @PostMapping("/requests/{id}/approve")
    public ApproveResponse approve(
            @PathVariable Long id,
            @Valid @RequestBody ApproveRequestPayload payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return operationService.approveFromRequest(id, payload, principal);
    }

    @PutMapping("/operations/{operationId}")
    public OperationResponse updateOperation(
            @PathVariable Long operationId,
            @Valid @RequestBody UpdateOperationPayload payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return operationService.update(operationId, payload, principal);
    }

    @GetMapping("/operations/{operationId}/participants")
    public List<ParticipantResponse> listParticipants(
            @PathVariable Long operationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return operationService.listParticipants(operationId, principal);
    }

    @PostMapping("/operations/{operationId}/participants")
    @ResponseStatus(HttpStatus.CREATED)
    public ParticipantResponse addParticipant(
            @PathVariable Long operationId,
            @Valid @RequestBody ParticipantPayload payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return operationService.addParticipant(operationId, payload, principal);
    }

    @PutMapping("/operations/{operationId}/participants/{participantId}")
    public ParticipantResponse updateParticipant(
            @PathVariable Long operationId,
            @PathVariable Long participantId,
            @Valid @RequestBody UpdateParticipantPayload payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return operationService.updateParticipantRole(operationId, participantId, payload, principal);
    }

    @DeleteMapping("/operations/{operationId}/participants/{participantId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteParticipant(
            @PathVariable Long operationId,
            @PathVariable Long participantId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        operationService.deleteParticipant(operationId, participantId, principal);
    }
}
