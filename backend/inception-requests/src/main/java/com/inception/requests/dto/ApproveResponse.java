package com.inception.requests.dto;

import com.inception.core.dto.OperationResponse;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ApproveResponse {

    private RequestResponse request;
    private OperationResponse operation;
}
