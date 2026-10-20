package com.inception.architecture.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class DreamLevelResponse {

    private String id;
    private String name;
    private String description;
    private String goal;
    private String parentLevelId;
    private List<String> participantIds;
    private List<KeyEventResponse> keyEvents;
}
