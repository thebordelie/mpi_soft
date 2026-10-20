package com.inception.monitoring.dto;

import com.inception.monitoring.entity.PasivChannelStatus;
import com.inception.monitoring.entity.PasivConnectionStatus;
import com.inception.monitoring.entity.SedationReadiness;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class LaunchStateResponse {

    private int currentStep;
    private SedationReadiness sedationReadiness;
    private String sedationRejectionReason;
    private String launchedAt;
    private boolean allConnected;
    private boolean canAdvanceToConfirm;
    private boolean canConfirmSedation;
    private boolean canLaunch;
    private boolean canManagePasiv;
    private List<PasivConnectionResponse> pasivConnections;
    private List<ParticipantSedationSummary> sedationSummaries;
}
