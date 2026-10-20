package com.inception.events.mapper;

import com.inception.events.dto.EventResponse;
import com.inception.events.entity.OperationEvent;

public final class EventMapper {

    private EventMapper() {
    }

    public static EventResponse toResponse(OperationEvent event) {
        return EventResponse.builder()
                .id(String.valueOf(event.getId()))
                .operationId(String.valueOf(event.getOperation().getId()))
                .timestamp(event.getCreatedAt().toString())
                .actor(event.getActorLogin())
                .action(event.getAction())
                .details(event.getDetails())
                .build();
    }
}
