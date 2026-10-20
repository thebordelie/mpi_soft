package com.inception.architecture.entity;

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
@Table(name = "dream_levels")
public class DreamLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operation_id", nullable = false)
    private InceptionOperation operation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_level_id")
    private DreamLevel parentLevel;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description = "";

    @Column(nullable = false, columnDefinition = "TEXT")
    private String goal = "";

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "dream_level_participants",
            joinColumns = @JoinColumn(name = "level_id"),
            inverseJoinColumns = @JoinColumn(name = "participant_id")
    )
    private Set<OperationParticipant> participants = new HashSet<>();
}
