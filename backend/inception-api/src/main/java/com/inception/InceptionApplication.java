package com.inception;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.nio.file.Path;

@SpringBootApplication(scanBasePackages = "com.inception")
@EntityScan(basePackages = "com.inception")
@EnableJpaRepositories(basePackages = "com.inception")
public class InceptionApplication {

    public static void main(String[] args) {
        SpringApplication.run(InceptionApplication.class, args);
    }

}
