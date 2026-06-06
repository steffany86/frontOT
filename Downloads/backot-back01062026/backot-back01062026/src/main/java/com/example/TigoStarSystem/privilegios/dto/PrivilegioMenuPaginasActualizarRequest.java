package com.example.TigoStarSystem.privilegios.dto;

import javax.validation.constraints.NotNull;
import java.util.List;

public class PrivilegioMenuPaginasActualizarRequest {
    @NotNull(message = "paginasAsociadas es requerido")
    private List<String> paginasAsociadas;

    public List<String> getPaginasAsociadas() {
        return paginasAsociadas;
    }

    public void setPaginasAsociadas(List<String> paginasAsociadas) {
        this.paginasAsociadas = paginasAsociadas;
    }
}

