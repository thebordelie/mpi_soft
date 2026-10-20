package com.inception.architecture.mapper;

import com.inception.architecture.dto.DreamLevelResponse;
import com.inception.architecture.dto.KeyEventResponse;
import com.inception.architecture.entity.DreamKeyEvent;
import com.inception.architecture.entity.DreamLevel;

import java.util.List;

public final class ArchitectureMapper {

    private ArchitectureMapper() {
    }

    public static DreamLevelResponse toDreamLevelResponse(DreamLevel level, List<DreamKeyEvent> keyEvents) {
        return DreamLevelResponse.builder()
                .id(String.valueOf(level.getId()))
                .name(level.getName())
                .description(level.getDescription())
                .goal(level.getGoal())
                .parentLevelId(level.getParentLevel() != null
                        ? String.valueOf(level.getParentLevel().getId()) : null)
                .participantIds(level.getParticipants().stream()
                        .map(p -> String.valueOf(p.getId()))
                        .toList())
                .keyEvents(keyEvents.stream().map(ArchitectureMapper::toKeyEventResponse).toList())
                .build();
    }

    public static KeyEventResponse toKeyEventResponse(DreamKeyEvent event) {
        return KeyEventResponse.builder()
                .id(String.valueOf(event.getId()))
                .name(event.getName())
                .description(event.getDescription())
                .participantIds(event.getParticipants().stream()
                        .map(p -> String.valueOf(p.getId()))
                        .toList())
                .build();
    }
}
