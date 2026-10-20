package com.inception.requests.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateOperationPayload {

    @NotBlank(message = "Укажите название операции")
    @Size(max = 200)
    private String name;

    @NotBlank(message = "Укажите ФИО объекта")
    @Size(max = 200)
    private String targetFullName;

    private String targetBirthDate;

    @NotBlank(message = "Укажите характеристику объекта")
    private String targetDescription;

    @Size(max = 50)
    private String customerLogin;

    @Size(max = 200)
    private String customerCompany;

    private String plannedDate;

    @NotBlank(message = "Укажите критерий успеха")
    private String successCriteria;
}
