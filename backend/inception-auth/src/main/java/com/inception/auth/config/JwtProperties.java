package com.inception.auth.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "inception.jwt")
public class JwtProperties {

    private String secret = "aPeJScUYjGir2XwpojGmSuAYtp6WYFaqXREEJ1UkQYY";
    private long expirationSeconds = 3600;
}
