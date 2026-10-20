package com.inception.core.repository;

import com.inception.core.entity.OperationPlanning;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OperationPlanningRepository extends JpaRepository<OperationPlanning, Long> {

    Optional<OperationPlanning> findByOperationId(Long operationId);
}
