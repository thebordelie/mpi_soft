package com.inception.requests.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RejectRequestPayload {

    @NotBlank(message = "Укажите причину отклонения")
    private String rejectionReason;
}
