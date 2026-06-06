package com.example.TigoStarSystem.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;

@Configuration
public class StartupInfoLogger {
    private static final Logger logger = LoggerFactory.getLogger(StartupInfoLogger.class);

    @Bean
    public ApplicationRunner logRuntimeInfo(Environment env) {
        return args -> {
            logger.info("spring.profiles.active={}", Arrays.toString(env.getActiveProfiles()));
            logger.info("spring.datasource.url={}", env.getProperty("spring.datasource.url"));
            logger.info("spring.datasource.driver-class-name={}", env.getProperty("spring.datasource.driver-class-name"));
            logger.info("app.central.datasource.url={}", env.getProperty("app.central.datasource.url"));
            logger.info("app.central.datasource.driver-class-name={}", env.getProperty("app.central.datasource.driver-class-name"));
            logger.info("app.cuadrilla.mail.enabled={}", env.getProperty("app.cuadrilla.mail.enabled"));
            logger.info("app.cuadrilla.mail.to={}", env.getProperty("app.cuadrilla.mail.to"));
            logger.info("app.cuadrilla.mail.from={}", env.getProperty("app.cuadrilla.mail.from"));
            logger.info("spring.mail.host={}", env.getProperty("spring.mail.host"));
            logger.info("spring.mail.port={}", env.getProperty("spring.mail.port"));
            logger.info("java.version={}", System.getProperty("java.version"));
            logger.info("java.home={}", System.getProperty("java.home"));
            logger.info("java.security.properties={}", System.getProperty("java.security.properties"));
            logger.info("jdk.tls.client.protocols={}", System.getProperty("jdk.tls.client.protocols"));
            logger.info("https.protocols={}", System.getProperty("https.protocols"));
            logger.info("jdk.tls.disabledAlgorithms={}", System.getProperty("jdk.tls.disabledAlgorithms"));
        };
    }
}
