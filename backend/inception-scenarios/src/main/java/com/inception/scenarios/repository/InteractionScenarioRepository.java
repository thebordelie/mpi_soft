package com.inception.scenarios.repository;

import com.inception.scenarios.entity.InteractionScenario;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InteractionScenarioRepository extends JpaRepository<InteractionScenario, Long> {

    @EntityGraph(attributePaths = {"level", "participants"})
    List<InteractionScenario> findByOperationIdOrderByIdAsc(Long operationId);

    @EntityGraph(attributePaths = "operation")
    Optional<InteractionScenario> findByIdAndOperationId(Long id, Long operationId);

    long countByOperationId(Long operationId);
}
