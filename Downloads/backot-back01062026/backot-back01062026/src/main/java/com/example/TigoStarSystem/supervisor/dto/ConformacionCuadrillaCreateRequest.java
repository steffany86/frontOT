package com.example.TigoStarSystem.supervisor.dto;

import javax.validation.constraints.NotEmpty;
import java.util.List;

public class ConformacionCuadrillaCreateRequest {
    @NotEmpty(message = "filas es requerido")
    private List<ConformacionCuadrillaRowRequest> filas;

    public List<ConformacionCuadrillaRowRequest> getFilas() {
        return filas;
    }

    public void setFilas(List<ConformacionCuadrillaRowRequest> filas) {
        this.filas = filas;
    }
}
