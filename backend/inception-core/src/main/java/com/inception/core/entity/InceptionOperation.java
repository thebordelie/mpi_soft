package com.inception.core.entity;

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
@Table(name = "operations")
public class InceptionOperation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", unique = true)
    private Long requestId;

    @Column(nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OperationStatus status = OperationStatus.active;

    @Column(name = "target_full_name", nullable = false, length = 200)
    private String targetFullName;

    @Column(name = "target_birth_date")
    private LocalDate targetBirthDate;

    @Column(name = "target_description", nullable = false, columnDefinition = "TEXT")
    private String targetDescription = "";

    @Column(name = "customer_login", nullable = false, length = 50)
    private String customerLogin;

    @Column(name = "customer_company", nullable = false, length = 200)
    private String customerCompany = "";

    @Column(name = "planned_date")
    private LocalDate plannedDate;

    @Column(name = "success_criteria", nullable = false, columnDefinition = "TEXT")
    private String successCriteria = "";

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private AppUser createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

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
