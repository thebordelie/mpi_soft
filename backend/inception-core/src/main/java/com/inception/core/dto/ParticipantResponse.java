package com.inception.core.dto;

import com.inception.core.entity.ParticipantRole;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ParticipantResponse {

    private String id;
    private String login;
    private String name;
    private ParticipantRole role;
}
