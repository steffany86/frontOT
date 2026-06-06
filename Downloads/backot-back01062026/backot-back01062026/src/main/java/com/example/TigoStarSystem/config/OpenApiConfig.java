package com.example.TigoStarSystem.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI otOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("TigoStarSystem - Orden de Trabajo API")
                        .version("v1")
                        .description("API de Orden de Trabajo (OT) y Cargo Usuario."));
    }
}
