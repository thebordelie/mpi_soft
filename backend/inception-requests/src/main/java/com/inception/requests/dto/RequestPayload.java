package com.inception.requests.dto;

import com.inception.requests.entity.RequestGoal;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RequestPayload {

    @Size(max = 200)
    private String name = "";

    private String description = "";

    private String plannedDate;

    @Size(max = 200)
    private String targetFullName = "";

    private String targetBirthDate;

    private String targetDescription = "";

    private String targetBehavior = "";

    private RequestGoal goal;

    private String desiredResult = "";

    private String successCriteria = "";

    @Size(max = 200)
    private String organizerLogin;

    @Size(max = 200)
    private String organization = "";
}
