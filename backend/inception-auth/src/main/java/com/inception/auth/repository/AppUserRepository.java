package com.inception.auth.repository;

import com.inception.auth.entity.AppUser;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    boolean existsByLoginIgnoreCase(String login);

    @EntityGraph(attributePaths = {"role", "role.privileges"})
    Optional<AppUser> findByLoginIgnoreCase(String login);

    @EntityGraph(attributePaths = "role")
    List<AppUser> findByRole_CodeIgnoreCaseAndEnabledTrue(String roleCode);

    @EntityGraph(attributePaths = "role")
    Optional<AppUser> findByLoginIgnoreCaseAndRole_CodeIgnoreCaseAndEnabledTrue(String login, String roleCode);
}
