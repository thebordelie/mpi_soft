package com.inception.architecture.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class KeyEventResponse {

    private String id;
    private String name;
    private String description;
    private List<String> participantIds;
}
