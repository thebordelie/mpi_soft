package com.inception.core.mapper;

import com.inception.core.dto.OperationResponse;
import com.inception.core.dto.ParticipantResponse;
import com.inception.core.entity.InceptionOperation;
import com.inception.core.entity.OperationParticipant;

import java.time.LocalDate;
import java.util.List;

public final class OperationResponseMapper {

    private OperationResponseMapper() {
    }

    public static OperationResponse toResponse(InceptionOperation operation, List<OperationParticipant> participants) {
        return OperationResponse.builder()
                .id(String.valueOf(operation.getId()))
                .requestId(operation.getRequestId() != null ? String.valueOf(operation.getRequestId()) : null)
                .name(operation.getName())
                .status(operation.getStatus())
                .targetFullName(operation.getTargetFullName())
                .targetBirthDate(formatDate(operation.getTargetBirthDate()))
                .targetDescription(operation.getTargetDescription())
                .customerFullName(operation.getCustomerLogin())
                .customerCompany(operation.getCustomerCompany())
                .date(formatDate(operation.getPlannedDate()))
                .successCriteria(operation.getSuccessCriteria())
                .createdBy(operation.getCreatedBy().getLogin())
                .createdAt(operation.getCreatedAt().toString())
                .updatedAt(operation.getUpdatedAt().toString())
                .participants(participants.stream().map(OperationResponseMapper::toParticipantResponse).toList())
                .build();
    }

    public static ParticipantResponse toParticipantResponse(OperationParticipant participant) {
        return ParticipantResponse.builder()
                .id(String.valueOf(participant.getId()))
                .login(participant.getUser().getLogin())
                .name(participant.getUser().getFullName())
                .role(participant.getRole())
                .build();
    }

    private static String formatDate(LocalDate date) {
        return date != null ? date.toString() : "";
    }
}
