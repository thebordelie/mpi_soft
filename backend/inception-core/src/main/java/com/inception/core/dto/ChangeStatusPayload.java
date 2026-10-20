package com.inception.core.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChangeStatusPayload {

    @NotBlank(message = "Укажите статус операции")
    private String status;
}
