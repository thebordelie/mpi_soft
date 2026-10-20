package com.inception.auth.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class MeResponse {

    private UserInfo user;
    private List<String> privileges;
}
