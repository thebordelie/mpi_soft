package com.inception.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {

    @NotBlank(message = "Введите логин")
    private String login;

    @NotBlank(message = "Введите пароль")
    private String password;
}
