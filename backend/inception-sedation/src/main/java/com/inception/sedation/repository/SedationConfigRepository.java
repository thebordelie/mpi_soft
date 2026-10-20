package com.inception.sedation.repository;

import com.inception.sedation.entity.SedationConfig;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SedationConfigRepository extends JpaRepository<SedationConfig, Long> {

    @EntityGraph(attributePaths = {"level", "participant", "participant.user"})
    List<SedationConfig> findByOperationIdOrderByIdAsc(Long operationId);

    @EntityGraph(attributePaths = "operation")
    Optional<SedationConfig> findByIdAndOperationId(Long id, Long operationId);

    long countByOperationId(Long operationId);
}
