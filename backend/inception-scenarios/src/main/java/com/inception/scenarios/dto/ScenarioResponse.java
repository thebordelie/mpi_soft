package com.inception.scenarios.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ScenarioResponse {

    private String id;
    private String name;
    private String levelId;
    private List<String> participantIds;
    private String description;
    private String trigger;
    private String expectedResult;
}
