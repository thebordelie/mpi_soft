package com.inception.monitoring.entity;

import com.inception.auth.entity.AppUser;
import com.inception.core.entity.InceptionOperation;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "operation_launch")
public class OperationLaunch {

    @Id
    private Long operationId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "operation_id")
    private InceptionOperation operation;

    @Column(name = "current_step", nullable = false)
    private int currentStep;

    @Enumerated(EnumType.STRING)
    @Column(name = "sedation_readiness", nullable = false, length = 20)
    private SedationReadiness sedationReadiness = SedationReadiness.pending;

    @Column(name = "sedation_rejection_reason", columnDefinition = "TEXT")
    private String sedationRejectionReason;

    @Column(name = "sedation_confirmed_at")
    private Instant sedationConfirmedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sedation_confirmed_by")
    private AppUser sedationConfirmedBy;

    @Column(name = "launched_at")
    private Instant launchedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "launched_by")
    private AppUser launchedBy;
}
