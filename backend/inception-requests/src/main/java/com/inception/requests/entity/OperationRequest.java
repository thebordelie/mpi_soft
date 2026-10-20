package com.inception.requests.entity;

import com.inception.auth.entity.AppUser;
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
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "operation_requests")
public class OperationRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RequestStatus status = RequestStatus.draft;

    @Column(nullable = false, length = 200)
    private String name = "";

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description = "";

    @Column(name = "planned_date")
    private LocalDate plannedDate;

    @Column(name = "target_full_name", nullable = false, length = 200)
    private String targetFullName = "";

    @Column(name = "target_birth_date")
    private LocalDate targetBirthDate;

    @Column(name = "target_description", nullable = false, columnDefinition = "TEXT")
    private String targetDescription = "";

    @Column(name = "target_behavior", nullable = false, columnDefinition = "TEXT")
    private String targetBehavior = "";

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private RequestGoal goal;

    @Column(name = "desired_result", nullable = false, columnDefinition = "TEXT")
    private String desiredResult = "";

    @Column(name = "success_criteria", nullable = false, columnDefinition = "TEXT")
    private String successCriteria = "";

    @Column(nullable = false, length = 200)
    private String organization = "";

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private AppUser customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizer_id")
    private AppUser organizer;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
