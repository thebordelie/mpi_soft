package com.inception.monitoring.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ParticipantSedationSummary {

    private String participantId;
    private String participantName;
    private String participantRole;
    private String compound;
    private String dosage;
    private String durationHours;
    private String method;
    private String levelName;
}
