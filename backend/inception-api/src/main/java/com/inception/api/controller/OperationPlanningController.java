package com.inception.api.controller;

import com.inception.auth.security.UserPrincipal;
import com.inception.core.dto.ChangeStatusPayload;
import com.inception.architecture.dto.DreamLevelPayload;
import com.inception.architecture.dto.DreamLevelResponse;
import com.inception.core.dto.OperationResponse;
import com.inception.core.dto.PlanningStateResponse;
import com.inception.scenarios.dto.ScenarioPayload;
import com.inception.scenarios.dto.ScenarioResponse;
import com.inception.sedation.dto.SedationConfigPayload;
import com.inception.sedation.dto.SedationConfigResponse;
import com.inception.requests.service.OperationPlanningService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/operations/{operationId}")
public class OperationPlanningController {

    private final OperationPlanningService planningService;

    public OperationPlanningController(OperationPlanningService planningService) {
        this.planningService = planningService;
    }

    @GetMapping("/planning")
    public PlanningStateResponse getPlanningState(
            @PathVariable Long operationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return planningService.getPlanningState(operationId, principal);
    }

    @PatchMapping("/status")
    public OperationResponse changeStatus(
            @PathVariable Long operationId,
            @Valid @RequestBody ChangeStatusPayload payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return planningService.changeStatus(operationId, payload, principal);
    }

    @GetMapping("/dream-levels")
    public List<DreamLevelResponse> listDreamLevels(
            @PathVariable Long operationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return planningService.listDreamLevels(operationId, principal);
    }

    @PostMapping("/dream-levels")
    @ResponseStatus(HttpStatus.CREATED)
    public DreamLevelResponse createDreamLevel(
            @PathVariable Long operationId,
            @Valid @RequestBody DreamLevelPayload payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return planningService.createDreamLevel(operationId, payload, principal);
    }

    @PutMapping("/dream-levels/{levelId}")
    public DreamLevelResponse updateDreamLevel(
            @PathVariable Long operationId,
            @PathVariable Long levelId,
            @Valid @RequestBody DreamLevelPayload payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return planningService.updateDreamLevel(operationId, levelId, payload, principal);
    }

    @DeleteMapping("/dream-levels/{levelId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDreamLevel(
            @PathVariable Long operationId,
            @PathVariable Long levelId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        planningService.deleteDreamLevel(operationId, levelId, principal);
    }

    @PostMapping("/architecture/fix")
    public PlanningStateResponse fixArchitecture(
            @PathVariable Long operationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return planningService.fixArchitecture(operationId, principal);
    }

    @GetMapping("/sedation-configs")
    public List<SedationConfigResponse> listSedationConfigs(
            @PathVariable Long operationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return planningService.listSedationConfigs(operationId, principal);
    }

    @PostMapping("/sedation-configs")
    @ResponseStatus(HttpStatus.CREATED)
    public SedationConfigResponse createSedationConfig(
            @PathVariable Long operationId,
            @Valid @RequestBody SedationConfigPayload payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return planningService.createSedationConfig(operationId, payload, principal);
    }

    @PutMapping("/sedation-configs/{configId}")
    public SedationConfigResponse updateSedationConfig(
            @PathVariable Long operationId,
            @PathVariable Long configId,
            @Valid @RequestBody SedationConfigPayload payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return planningService.updateSedationConfig(operationId, configId, payload, principal);
    }

    @DeleteMapping("/sedation-configs/{configId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSedationConfig(
            @PathVariable Long operationId,
            @PathVariable Long configId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        planningService.deleteSedationConfig(operationId, configId, principal);
    }

    @PostMapping("/sedation/fix")
    public PlanningStateResponse fixSedation(
            @PathVariable Long operationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return planningService.fixSedation(operationId, principal);
    }

    @GetMapping("/scenarios")
    public List<ScenarioResponse> listScenarios(
            @PathVariable Long operationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return planningService.listScenarios(operationId, principal);
    }

    @PostMapping("/scenarios")
    @ResponseStatus(HttpStatus.CREATED)
    public ScenarioResponse createScenario(
            @PathVariable Long operationId,
            @Valid @RequestBody ScenarioPayload payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return planningService.createScenario(operationId, payload, principal);
    }

    @PutMapping("/scenarios/{scenarioId}")
    public ScenarioResponse updateScenario(
            @PathVariable Long operationId,
            @PathVariable Long scenarioId,
            @Valid @RequestBody ScenarioPayload payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return planningService.updateScenario(operationId, scenarioId, payload, principal);
    }

    @DeleteMapping("/scenarios/{scenarioId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteScenario(
            @PathVariable Long operationId,
            @PathVariable Long scenarioId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        planningService.deleteScenario(operationId, scenarioId, principal);
    }

    @PostMapping("/scenarios/fix")
    public PlanningStateResponse fixScenarios(
            @PathVariable Long operationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return planningService.fixScenarios(operationId, principal);
    }
}
