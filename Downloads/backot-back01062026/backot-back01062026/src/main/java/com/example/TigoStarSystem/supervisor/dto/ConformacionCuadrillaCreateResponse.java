package com.example.TigoStarSystem.supervisor.dto;

public class ConformacionCuadrillaCreateResponse {
    private final int filasInsertadas;

    public ConformacionCuadrillaCreateResponse(int filasInsertadas) {
        this.filasInsertadas = filasInsertadas;
    }

    public int getFilasInsertadas() {
        return filasInsertadas;
    }
}
