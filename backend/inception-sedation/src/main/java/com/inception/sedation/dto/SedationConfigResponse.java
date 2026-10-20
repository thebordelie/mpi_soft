package com.inception.sedation.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class SedationConfigResponse {

    private String id;
    private String levelId;
    private String participantId;
    private String compound;
    private BigDecimal dosage;
    private BigDecimal durationHours;
    private String method;
    private String notes;
}
