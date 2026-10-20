package com.inception.scenarios.mapper;

import com.inception.scenarios.dto.ScenarioResponse;
import com.inception.scenarios.entity.InteractionScenario;

public final class ScenarioMapper {

    private ScenarioMapper() {
    }

    public static ScenarioResponse toScenarioResponse(InteractionScenario scenario) {
        return ScenarioResponse.builder()
                .id(String.valueOf(scenario.getId()))
                .name(scenario.getName())
                .levelId(String.valueOf(scenario.getLevel().getId()))
                .participantIds(scenario.getParticipants().stream()
                        .map(p -> String.valueOf(p.getId()))
                        .toList())
                .description(scenario.getDescription())
                .trigger(scenario.getTriggerText())
                .expectedResult(scenario.getExpectedResult())
                .build();
    }
}
