package com.inception.requests.repository;

import com.inception.requests.entity.OperationRequest;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.inception.requests.entity.RequestStatus;

import java.util.List;
import java.util.Optional;

public interface OperationRequestRepository extends JpaRepository<OperationRequest, Long> {

    @EntityGraph(attributePaths = {"customer", "organizer"})
    List<OperationRequest> findByCustomerIdOrderByUpdatedAtDesc(Long customerId);

    @EntityGraph(attributePaths = {"customer", "organizer"})
    List<OperationRequest> findByOrganizerIdOrderByUpdatedAtDesc(Long organizerId);

    @EntityGraph(attributePaths = {"customer", "organizer"})
    @Query("SELECT r FROM OperationRequest r WHERE r.id = :id")
    Optional<OperationRequest> findDetailedById(@Param("id") Long id);

    long countByOrganizerIdAndStatus(Long organizerId, RequestStatus status);
}
