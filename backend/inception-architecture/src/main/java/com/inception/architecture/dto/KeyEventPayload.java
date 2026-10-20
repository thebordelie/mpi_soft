package com.inception.architecture.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class KeyEventPayload {

    @NotBlank(message = "Введите название события")
    private String name;

    private String description = "";

    private List<String> participantIds = new ArrayList<>();
}
