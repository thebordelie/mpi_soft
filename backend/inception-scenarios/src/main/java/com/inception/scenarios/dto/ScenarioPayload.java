package com.inception.scenarios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class ScenarioPayload {

    @NotBlank(message = "Введите название сценария")
    private String name;

    @NotBlank(message = "Выберите уровень сна")
    private String levelId;

    @NotEmpty(message = "Назначьте участников сценария")
    private List<String> participantIds = new ArrayList<>();

    private String description = "";

    @NotBlank(message = "Укажите триггер сценария")
    private String trigger;

    @NotBlank(message = "Укажите ожидаемый результат")
    private String expectedResult;
}
