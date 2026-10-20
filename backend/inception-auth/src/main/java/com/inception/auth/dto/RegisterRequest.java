package com.inception.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank(message = "Введите логин")
    @Size(min = 3, max = 50, message = "Логин должен быть от 3 до 50 символов")
    private String login;

    @NotBlank(message = "Введите ФИО")
    @Size(max = 200, message = "ФИО не должно превышать 200 символов")
    private String fullName;

    @NotBlank(message = "Выберите роль")
    private String role;

    @NotBlank(message = "Введите пароль")
    @Size(min = 4, max = 100, message = "Пароль должен быть от 4 до 100 символов")
    private String password;
}
