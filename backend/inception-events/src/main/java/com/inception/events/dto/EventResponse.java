package com.inception.events.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class EventResponse {

    private String id;
    private String operationId;
    private String timestamp;
    private String actor;
    private String action;
    private String details;
}
