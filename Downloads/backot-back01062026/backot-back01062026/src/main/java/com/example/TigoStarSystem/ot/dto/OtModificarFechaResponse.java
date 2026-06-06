package com.example.TigoStarSystem.ot.dto;

import java.util.List;
import java.util.Map;

public class OtModificarFechaResponse {
    private final int filasActualizadas;
    private final List<Map<String, Object>> validacionCuadre;
    private final List<Map<String, Object>> validacionModificacion;

    public OtModificarFechaResponse(int filasActualizadas,
                                    List<Map<String, Object>> validacionCuadre,
                                    List<Map<String, Object>> validacionModificacion) {
        this.filasActualizadas = filasActualizadas;
        this.validacionCuadre = validacionCuadre;
        this.validacionModificacion = validacionModificacion;
    }

    public int getFilasActualizadas() {
        return filasActualizadas;
    }

    public List<Map<String, Object>> getValidacionCuadre() {
        return validacionCuadre;
    }

    public List<Map<String, Object>> getValidacionModificacion() {
        return validacionModificacion;
    }
}
