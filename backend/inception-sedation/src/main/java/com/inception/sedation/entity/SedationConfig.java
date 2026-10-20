package com.inception.sedation.entity;

import com.inception.architecture.entity.DreamLevel;
import com.inception.core.entity.InceptionOperation;
import com.inception.core.entity.OperationParticipant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "sedation_configs")
public class SedationConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operation_id", nullable = false)
    private InceptionOperation operation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "level_id", nullable = false)
    private DreamLevel level;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant_id", nullable = false)
    private OperationParticipant participant;

    @Column(nullable = false, length = 50)
    private String compound;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal dosage;

    @Column(name = "duration_hours", nullable = false, precision = 10, scale = 2)
    private BigDecimal durationHours;

    @Column(nullable = false, length = 30)
    private String method;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String notes = "";
}
