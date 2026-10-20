package com.inception.architecture.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class DreamLevelPayload {

    @NotBlank(message = "Введите название уровня")
    private String name;

    private String description = "";

    @NotBlank(message = "Укажите цель уровня")
    private String goal;

    private String parentLevelId;

    @NotEmpty(message = "Назначьте участников на уровень")
    private List<String> participantIds = new ArrayList<>();

    @Valid
    private List<KeyEventPayload> keyEvents = new ArrayList<>();
}
