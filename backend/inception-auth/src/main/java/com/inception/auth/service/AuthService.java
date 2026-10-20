package com.inception.auth.service;

import com.inception.auth.dto.AuthResponse;
import com.inception.auth.dto.LoginRequest;
import com.inception.auth.dto.MeResponse;
import com.inception.auth.dto.RegisterRequest;
import com.inception.auth.dto.UserInfo;
import com.inception.auth.entity.AppUser;
import com.inception.auth.entity.Privilege;
import com.inception.auth.entity.Role;
import com.inception.auth.exception.AuthException;
import com.inception.auth.repository.AppUserRepository;
import com.inception.auth.repository.RoleRepository;
import com.inception.auth.security.JwtService;
import com.inception.auth.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (appUserRepository.existsByLoginIgnoreCase(request.getLogin())) {
            throw new AuthException("Пользователь с таким логином уже существует");
        }

        Role role = roleRepository.findByCodeIgnoreCase(request.getRole())
                .orElseThrow(() -> new AuthException("Указана недопустимая роль"));

        AppUser user = new AppUser();
        user.setLogin(request.getLogin().trim());
        user.setFullName(request.getFullName().trim());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setEnabled(true);

        AppUser saved = appUserRepository.save(user);
        return buildAuthResponse(saved);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getLogin().trim(), request.getPassword())
            );
            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            AppUser user = appUserRepository.findByLoginIgnoreCase(principal.getLogin())
                    .orElseThrow(() -> new AuthException("Пользователь не найден"));
            return buildAuthResponse(user);
        } catch (BadCredentialsException ex) {
            throw new AuthException("Неверный логин или пароль");
        }
    }

    @Transactional(readOnly = true)
    public MeResponse getCurrentUser(UserPrincipal principal) {
        return MeResponse.builder()
                .user(toUserInfo(principal))
                .privileges(principal.getPrivileges())
                .build();
    }

    private AuthResponse buildAuthResponse(AppUser user) {
        List<String> privileges = user.getRole().getPrivileges().stream()
                .map(Privilege::getCode)
                .sorted()
                .toList();

        String token = jwtService.generateToken(user, privileges);

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpirationSeconds())
                .user(toUserInfo(user))
                .privileges(privileges)
                .build();
    }

    private UserInfo toUserInfo(AppUser user) {
        return UserInfo.builder()
                .login(user.getLogin())
                .fullName(user.getFullName())
                .role(user.getRole().getCode().toLowerCase())
                .roleName(user.getRole().getName())
                .build();
    }

    private UserInfo toUserInfo(UserPrincipal principal) {
        return UserInfo.builder()
                .login(principal.getLogin())
                .fullName(principal.getFullName())
                .role(principal.getRoleCode().toLowerCase())
                .roleName(principal.getRoleName())
                .build();
    }
}
