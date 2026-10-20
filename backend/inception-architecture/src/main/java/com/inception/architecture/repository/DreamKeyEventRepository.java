package com.inception.architecture.repository;

import com.inception.architecture.entity.DreamKeyEvent;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DreamKeyEventRepository extends JpaRepository<DreamKeyEvent, Long> {

    @EntityGraph(attributePaths = {"level", "participants"})
    List<DreamKeyEvent> findByLevelIdOrderByIdAsc(Long levelId);

    void deleteByLevelId(Long levelId);
}
