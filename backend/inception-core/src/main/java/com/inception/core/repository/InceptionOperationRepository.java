package com.inception.core.repository;

import com.inception.core.entity.InceptionOperation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InceptionOperationRepository extends JpaRepository<InceptionOperation, Long> {

    @EntityGraph(attributePaths = "createdBy")
    List<InceptionOperation> findByCreatedByIdOrderByUpdatedAtDesc(Long createdById);

    @EntityGraph(attributePaths = "createdBy")
    @Query("""
            SELECT DISTINCT o FROM InceptionOperation o
            JOIN OperationParticipant p ON p.operation = o
            WHERE p.user.id = :userId
            ORDER BY o.updatedAt DESC
            """)
    List<InceptionOperation> findByParticipantUserId(@Param("userId") Long userId);

    @EntityGraph(attributePaths = "createdBy")
    @Query("SELECT o FROM InceptionOperation o WHERE o.id = :id")
    Optional<InceptionOperation> findDetailedById(@Param("id") Long id);

    boolean existsByRequestId(Long requestId);
}
