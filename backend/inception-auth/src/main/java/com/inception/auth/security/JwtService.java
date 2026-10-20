package com.inception.auth.security;

import com.inception.auth.config.JwtProperties;
import com.inception.auth.entity.AppUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

@Service
public class JwtService {

    private final JwtProperties jwtProperties;
    private final SecretKey secretKey;

    public JwtService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        this.secretKey = Keys.hmacShaKeyFor(resolveKeyBytes(jwtProperties.getSecret()));
    }

    public String generateToken(AppUser user, List<String> privileges) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtProperties.getExpirationSeconds() * 1000);

        return Jwts.builder()
                .subject(user.getLogin())
                .claim("role", user.getRole().getCode())
                .claim("fullName", user.getFullName())
                .claim("privileges", privileges)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long getExpirationSeconds() {
        return jwtProperties.getExpirationSeconds();
    }

    private static byte[] resolveKeyBytes(String secret) {
        try {
            return Decoders.BASE64.decode(secret);
        } catch (Exception ignored) {
            byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
            if (bytes.length < 32) {
                throw new IllegalArgumentException(
                        "JWT secret must be at least 256 bits. Provide a longer string or a Base64-encoded key."
                );
            }
            return bytes;
        }
    }
}
