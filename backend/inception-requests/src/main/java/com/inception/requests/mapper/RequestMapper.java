package com.inception.requests.mapper;

import com.inception.requests.dto.RequestPayload;
import com.inception.requests.dto.RequestResponse;
import com.inception.requests.entity.OperationRequest;
import com.inception.requests.entity.RequestGoal;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

public final class RequestMapper {

    private RequestMapper() {
    }

    public static RequestResponse toResponse(OperationRequest request) {
        return RequestResponse.builder()
                .id(String.valueOf(request.getId()))
                .status(request.getStatus())
                .name(request.getName())
                .description(request.getDescription())
                .plannedDate(formatDate(request.getPlannedDate()))
                .targetFullName(request.getTargetFullName())
                .targetBirthDate(formatDate(request.getTargetBirthDate()))
                .targetDescription(request.getTargetDescription())
                .targetBehavior(request.getTargetBehavior())
                .goal(request.getGoal())
                .desiredResult(request.getDesiredResult())
                .successCriteria(request.getSuccessCriteria())
                .organizerLogin(request.getOrganizer() != null ? request.getOrganizer().getLogin() : "")
                .organization(request.getOrganization())
                .rejectionReason(request.getRejectionReason())
                .createdBy(request.getCustomer().getLogin())
                .createdAt(request.getCreatedAt().toString())
                .updatedAt(request.getUpdatedAt().toString())
                .build();
    }

    public static LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Некорректный формат даты: " + value);
        }
    }

    public static String formatDate(LocalDate date) {
        return date != null ? date.toString() : "";
    }

    public static void applyPayload(OperationRequest request, RequestPayload payload) {
        if (payload.getName() != null) {
            request.setName(payload.getName().trim());
        }
        if (payload.getDescription() != null) {
            request.setDescription(payload.getDescription().trim());
        }
        if (payload.getPlannedDate() != null) {
            request.setPlannedDate(parseDate(payload.getPlannedDate()));
        }
        if (payload.getTargetFullName() != null) {
            request.setTargetFullName(payload.getTargetFullName().trim());
        }
        if (payload.getTargetBirthDate() != null) {
            request.setTargetBirthDate(parseDate(payload.getTargetBirthDate()));
        }
        if (payload.getTargetDescription() != null) {
            request.setTargetDescription(payload.getTargetDescription().trim());
        }
        if (payload.getTargetBehavior() != null) {
            request.setTargetBehavior(payload.getTargetBehavior().trim());
        }
        if (payload.getGoal() != null) {
            request.setGoal(payload.getGoal());
        }
        if (payload.getDesiredResult() != null) {
            request.setDesiredResult(payload.getDesiredResult().trim());
        }
        if (payload.getSuccessCriteria() != null) {
            request.setSuccessCriteria(payload.getSuccessCriteria().trim());
        }
        if (payload.getOrganization() != null) {
            request.setOrganization(payload.getOrganization().trim());
        }
    }
}
