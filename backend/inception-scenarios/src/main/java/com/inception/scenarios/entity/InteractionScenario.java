package com.inception.scenarios.entity;

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
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "interaction_scenarios")
public class InteractionScenario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operation_id", nullable = false)
    private InceptionOperation operation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "level_id", nullable = false)
    private DreamLevel level;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description = "";

    @Column(name = "trigger_text", nullable = false, columnDefinition = "TEXT")
    private String triggerText = "";

    @Column(name = "expected_result", nullable = false, columnDefinition = "TEXT")
    private String expectedResult = "";

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "scenario_participants",
            joinColumns = @JoinColumn(name = "scenario_id"),
            inverseJoinColumns = @JoinColumn(name = "participant_id")
    )
    private Set<OperationParticipant> participants = new HashSet<>();
}
