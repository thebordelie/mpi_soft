package com.inception.requests.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrganizerResponse {

    private String login;
    private String fullName;
}
