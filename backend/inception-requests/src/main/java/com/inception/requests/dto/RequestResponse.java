package com.inception.requests.dto;

import com.inception.requests.entity.RequestGoal;
import com.inception.requests.entity.RequestStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RequestResponse {

    private String id;
    private RequestStatus status;
    private String name;
    private String description;
    private String plannedDate;
    private String targetFullName;
    private String targetBirthDate;
    private String targetDescription;
    private String targetBehavior;
    private RequestGoal goal;
    private String desiredResult;
    private String successCriteria;
    private String organizerLogin;
    private String organization;
    private String rejectionReason;
    private String createdBy;
    private String createdAt;
    private String updatedAt;
}
