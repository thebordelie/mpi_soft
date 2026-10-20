package com.inception.core.entity;

import com.inception.auth.entity.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "operation_planning")
public class OperationPlanning {

    @Id
    private Long operationId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "operation_id")
    private InceptionOperation operation;

    @Column(name = "architecture_fixed_at")
    private Instant architectureFixedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "architecture_fixed_by")
    private AppUser architectureFixedBy;

    @Column(name = "sedation_fixed_at")
    private Instant sedationFixedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sedation_fixed_by")
    private AppUser sedationFixedBy;

    @Column(name = "scenarios_fixed_at")
    private Instant scenariosFixedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scenarios_fixed_by")
    private AppUser scenariosFixedBy;

    public boolean isArchitectureFixed() {
        return architectureFixedAt != null;
    }

    public boolean isSedationFixed() {
        return sedationFixedAt != null;
    }

    public boolean isScenariosFixed() {
        return scenariosFixedAt != null;
    }

    public boolean isFullyFixed() {
        return isArchitectureFixed() && isSedationFixed() && isScenariosFixed();
    }
}
