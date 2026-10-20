package com.inception.core.dto;

import com.inception.core.entity.OperationStatus;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class OperationResponse {

    private String id;
    private String requestId;
    private String name;
    private OperationStatus status;
    private String targetFullName;
    private String targetBirthDate;
    private String targetDescription;
    private String customerFullName;
    private String customerCompany;
    private String date;
    private String successCriteria;
    private String createdBy;
    private String createdAt;
    private String updatedAt;
    private List<ParticipantResponse> participants;
}
