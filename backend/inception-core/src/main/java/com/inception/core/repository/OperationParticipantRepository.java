package com.inception.core.repository;

import com.inception.core.entity.OperationParticipant;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OperationParticipantRepository extends JpaRepository<OperationParticipant, Long> {

    @EntityGraph(attributePaths = "user")
    List<OperationParticipant> findByOperationId(Long operationId);

    @EntityGraph(attributePaths = {"user", "operation", "operation.createdBy"})
    Optional<OperationParticipant> findByIdAndOperationId(Long id, Long operationId);

    boolean existsByOperationIdAndUserId(Long operationId, Long userId);
}
