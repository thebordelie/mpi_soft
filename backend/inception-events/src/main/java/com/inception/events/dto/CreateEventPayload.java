package com.inception.events.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateEventPayload {

    @NotBlank(message = "Укажите действие")
    @Size(max = 200, message = "Действие не должно превышать 200 символов")
    private String action;

    @NotBlank(message = "Укажите описание события")
    @Size(max = 4000, message = "Описание не должно превышать 4000 символов")
    private String details;
}
