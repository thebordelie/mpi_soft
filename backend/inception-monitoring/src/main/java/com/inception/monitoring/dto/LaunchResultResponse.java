package com.inception.monitoring.dto;

import com.inception.core.dto.OperationResponse;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LaunchResultResponse {

    private OperationResponse operation;
    private LaunchStateResponse launch;
}
