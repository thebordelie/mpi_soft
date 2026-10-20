package com.inception.auth.repository;

import com.inception.auth.entity.Role;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {

    @EntityGraph(attributePaths = "privileges")
    Optional<Role> findByCodeIgnoreCase(String code);
}
