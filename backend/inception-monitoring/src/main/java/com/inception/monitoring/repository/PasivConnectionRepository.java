package com.inception.monitoring.repository;

import com.inception.monitoring.entity.PasivConnection;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PasivConnectionRepository extends JpaRepository<PasivConnection, Long> {

    @EntityGraph(attributePaths = {"participant", "participant.user"})
    List<PasivConnection> findByOperationIdOrderByIdAsc(Long operationId);

    @EntityGraph(attributePaths = {"operation", "participant", "participant.user"})
    Optional<PasivConnection> findByIdAndOperationId(Long id, Long operationId);

    @EntityGraph(attributePaths = {"operation", "participant"})
    Optional<PasivConnection> findByOperationIdAndParticipantId(Long operationId, Long participantId);

    long countByOperationIdAndConnectionStatus(
            Long operationId,
            com.inception.monitoring.entity.PasivConnectionStatus connectionStatus
    );
}
