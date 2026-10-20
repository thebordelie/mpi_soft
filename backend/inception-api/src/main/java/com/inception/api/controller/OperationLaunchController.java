package com.inception.api.controller;

import com.inception.auth.security.UserPrincipal;
import com.inception.monitoring.dto.LaunchResultResponse;
import com.inception.monitoring.dto.LaunchStateResponse;
import com.inception.core.dto.OperationResponse;
import com.inception.monitoring.dto.PasivConnectionResponse;
import com.inception.monitoring.dto.RejectSedationPayload;
import com.inception.monitoring.service.OperationLaunchService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/operations/{operationId}/launch")
public class OperationLaunchController {

    private final OperationLaunchService launchService;

    public OperationLaunchController(OperationLaunchService launchService) {
        this.launchService = launchService;
    }

    @GetMapping
    public LaunchStateResponse getLaunchState(
            @PathVariable Long operationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return launchService.getLaunchState(operationId, principal);
    }

    @PostMapping("/begin")
    public OperationResponse beginLaunch(
            @PathVariable Long operationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return launchService.beginLaunch(operationId, principal);
    }

    @PostMapping("/pasiv/{participantId}/connect")
    public PasivConnectionResponse connectPasiv(
            @PathVariable Long operationId,
            @PathVariable Long participantId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return launchService.connectPasiv(operationId, participantId, principal);
    }

    @PostMapping("/pasiv/{participantId}/disconnect")
    public PasivConnectionResponse disconnectPasiv(
            @PathVariable Long operationId,
            @PathVariable Long participantId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return launchService.disconnectPasiv(operationId, participantId, principal);
    }

    @PostMapping("/advance-step")
    public LaunchStateResponse advanceStep(
            @PathVariable Long operationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return launchService.advanceStep(operationId, principal);
    }

    @PostMapping("/confirm-sedation")
    public LaunchStateResponse confirmSedation(
            @PathVariable Long operationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return launchService.confirmSedation(operationId, principal);
    }

    @PostMapping("/reject-sedation")
    public LaunchResultResponse rejectSedation(
            @PathVariable Long operationId,
            @Valid @RequestBody RejectSedationPayload payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return launchService.rejectSedation(operationId, payload, principal);
    }

    @PostMapping("/execute")
    public LaunchResultResponse executeLaunch(
            @PathVariable Long operationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return launchService.executeLaunch(operationId, principal);
    }

    @PostMapping("/complete")
    public LaunchResultResponse completeOperation(
            @PathVariable Long operationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return launchService.completeOperation(operationId, principal);
    }
}
