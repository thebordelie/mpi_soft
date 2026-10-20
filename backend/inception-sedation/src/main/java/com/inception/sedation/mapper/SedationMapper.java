package com.inception.sedation.mapper;

import com.inception.sedation.dto.SedationConfigResponse;
import com.inception.sedation.entity.SedationConfig;

public final class SedationMapper {

    private SedationMapper() {
    }

    public static SedationConfigResponse toSedationResponse(SedationConfig config) {
        return SedationConfigResponse.builder()
                .id(String.valueOf(config.getId()))
                .levelId(String.valueOf(config.getLevel().getId()))
                .participantId(String.valueOf(config.getParticipant().getId()))
                .compound(config.getCompound())
                .dosage(config.getDosage())
                .durationHours(config.getDurationHours())
                .method(config.getMethod())
                .notes(config.getNotes())
                .build();
    }
}
