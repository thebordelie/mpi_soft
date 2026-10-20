package com.inception.monitoring.repository;

import com.inception.monitoring.entity.OperationLaunch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OperationLaunchRepository extends JpaRepository<OperationLaunch, Long> {

    Optional<OperationLaunch> findByOperationId(Long operationId);
}
