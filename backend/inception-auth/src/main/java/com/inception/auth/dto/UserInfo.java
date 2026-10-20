package com.inception.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserInfo {

    private String login;
    private String fullName;
    private String role;
    private String roleName;
}
