package com.inception.architecture.repository;

import com.inception.architecture.entity.DreamLevel;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DreamLevelRepository extends JpaRepository<DreamLevel, Long> {

    @EntityGraph(attributePaths = {"parentLevel", "operation", "participants"})
    List<DreamLevel> findByOperationIdOrderBySortOrderAscIdAsc(Long operationId);

    @EntityGraph(attributePaths = "operation")
    Optional<DreamLevel> findByIdAndOperationId(Long id, Long operationId);

    long countByOperationId(Long operationId);
}
