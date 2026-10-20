package com.inception.monitoring.entity;

import com.inception.core.entity.InceptionOperation;
import com.inception.core.entity.OperationParticipant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "pasiv_connections")
public class PasivConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operation_id", nullable = false)
    private InceptionOperation operation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant_id", nullable = false)
    private OperationParticipant participant;

    @Enumerated(EnumType.STRING)
    @Column(name = "connection_status", nullable = false, length = 20)
    private PasivConnectionStatus connectionStatus = PasivConnectionStatus.disconnected;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel_status", nullable = false, length = 20)
    private PasivChannelStatus channelStatus = PasivChannelStatus.offline;

    @Column(name = "sedation_active", nullable = false)
    private boolean sedationActive;
}
