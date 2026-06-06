package com.example.TigoStarSystem.ot.dto;

import javax.validation.constraints.NotEmpty;

import java.util.Map;

public class CuNoRealizadoCreateRequest {
    @NotEmpty(message = "datos es requerido")
    private Map<String, Object> datos;

    public Map<String, Object> getDatos() {
        return datos;
    }

    public void setDatos(Map<String, Object> datos) {
        this.datos = datos;
    }
}

