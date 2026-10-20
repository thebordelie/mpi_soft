package com.inception.auth.security;

import com.inception.auth.entity.AppUser;
import com.inception.auth.entity.Privilege;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.stream.Stream;

@Getter
public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String login;
    private final String fullName;
    private final String roleCode;
    private final String roleName;
    private final String passwordHash;
    private final boolean enabled;
    private final List<String> privileges;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(AppUser user) {
        this.id = user.getId();
        this.login = user.getLogin();
        this.fullName = user.getFullName();
        this.roleCode = user.getRole().getCode();
        this.roleName = user.getRole().getName();
        this.passwordHash = user.getPasswordHash();
        this.enabled = user.isEnabled();
        this.privileges = user.getRole().getPrivileges().stream()
                .map(Privilege::getCode)
                .sorted()
                .toList();
        this.authorities = Stream.concat(
                Stream.of(new SimpleGrantedAuthority("ROLE_" + roleCode)),
                privileges.stream().map(SimpleGrantedAuthority::new)
        ).toList();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return login;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
