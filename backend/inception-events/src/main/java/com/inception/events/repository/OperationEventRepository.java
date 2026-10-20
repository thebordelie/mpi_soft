package com.inception.events.repository;

import com.inception.events.entity.OperationEvent;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OperationEventRepository extends JpaRepository<OperationEvent, Long> {

    @EntityGraph(attributePaths = "operation")
    List<OperationEvent> findByOperationIdOrderByCreatedAtDesc(Long operationId);
}
