package com.inception.monitoring.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RejectSedationPayload {

    @NotBlank(message = "Укажите причину отклонения")
    private String rejectionReason;
}
