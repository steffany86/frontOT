package com.example.TigoStarSystem.privilegios.dto;

public class PrivilegioRolResponse {
    private final Integer idRol;
    private final String nombre;

    public PrivilegioRolResponse(Integer idRol, String nombre) {
        this.idRol = idRol;
        this.nombre = nombre;
    }

    public Integer getIdRol() {
        return idRol;
    }

    public String getNombre() {
        return nombre;
    }
}
