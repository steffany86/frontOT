package com.example.TigoStarSystem.privilegios.dto;

import java.util.List;

public class PrivilegioMenuPaginasResponse {
    private final Integer idMenu;
    private final String nombre;
    private final List<String> paginasAsociadas;

    public PrivilegioMenuPaginasResponse(Integer idMenu, String nombre, List<String> paginasAsociadas) {
        this.idMenu = idMenu;
        this.nombre = nombre;
        this.paginasAsociadas = paginasAsociadas;
    }

    public Integer getIdMenu() {
        return idMenu;
    }

    public String getNombre() {
        return nombre;
    }

    public List<String> getPaginasAsociadas() {
        return paginasAsociadas;
    }
}

