package com.inception.core.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PlanningStateResponse {

    private boolean architectureFixed;
    private boolean sedationFixed;
    private boolean scenariosFixed;
    private boolean canFinalize;
    private boolean canEditArchitecture;
    private boolean canEditSedation;
    private boolean canEditScenarios;
}
