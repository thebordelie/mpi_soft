package com.inception.requests.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserLookupResponse {

    private String login;
    private String fullName;
    private String role;
}
