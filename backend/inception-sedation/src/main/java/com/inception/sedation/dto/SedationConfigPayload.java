package com.inception.sedation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class SedationConfigPayload {

    @NotBlank(message = "Выберите уровень сна")
    private String levelId;

    @NotBlank(message = "Выберите участника")
    private String participantId;

    @NotBlank(message = "Выберите состав")
    private String compound;

    @NotNull(message = "Укажите дозировку")
    @Positive(message = "Дозировка должна быть положительной")
    private BigDecimal dosage;

    @NotNull(message = "Укажите длительность")
    @Positive(message = "Длительность должна быть положительной")
    private BigDecimal durationHours;

    @NotBlank(message = "Выберите способ введения")
    private String method;

    private String notes = "";
}
