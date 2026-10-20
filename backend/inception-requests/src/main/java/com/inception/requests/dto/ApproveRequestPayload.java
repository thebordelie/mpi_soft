package com.inception.requests.dto;

import jakarta.validation.Valid;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class ApproveRequestPayload {

    @Valid
    private List<ParticipantPayload> participants = new ArrayList<>();
}
