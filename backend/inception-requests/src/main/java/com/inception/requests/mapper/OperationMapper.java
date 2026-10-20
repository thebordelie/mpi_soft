package com.inception.requests.mapper;

import com.inception.core.dto.OperationResponse;
import com.inception.core.dto.ParticipantResponse;
import com.inception.core.entity.InceptionOperation;
import com.inception.core.entity.OperationParticipant;
import com.inception.core.mapper.OperationResponseMapper;

import java.util.List;

public final class OperationMapper {

    private OperationMapper() {
    }

    public static OperationResponse toResponse(InceptionOperation operation, List<OperationParticipant> participants) {
        return OperationResponseMapper.toResponse(operation, participants);
    }

    public static ParticipantResponse toParticipantResponse(OperationParticipant participant) {
        return OperationResponseMapper.toParticipantResponse(participant);
    }
}
