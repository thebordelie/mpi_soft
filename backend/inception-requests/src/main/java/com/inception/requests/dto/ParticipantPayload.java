package com.inception.requests.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ParticipantPayload {

    @NotBlank(message = "Введите логин участника")
    private String login;

    @NotBlank(message = "Выберите роль участника")
    private String role;
}
