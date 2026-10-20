package com.inception.monitoring.dto;

import com.inception.monitoring.entity.PasivChannelStatus;
import com.inception.monitoring.entity.PasivConnectionStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PasivConnectionResponse {

    private String id;
    private String participantId;
    private String participantLogin;
    private String participantName;
    private String participantRole;
    private PasivConnectionStatus connectionStatus;
    private PasivChannelStatus channelStatus;
    private boolean sedationActive;
    private String levelName;
}
