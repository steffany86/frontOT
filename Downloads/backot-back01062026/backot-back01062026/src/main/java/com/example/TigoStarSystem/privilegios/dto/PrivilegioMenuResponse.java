package com.example.TigoStarSystem.privilegios.dto;

import java.util.Collections;
import java.util.List;

public class PrivilegioMenuResponse {
    private final Integer idMenu;
    private final String nombre;
    private final String nombreMostrar;
    private final String nombreSidebar;
    private final String paginaAsociada;
    private final List<String> paginasAsociadas;
    private final Integer nivel;
    private final Integer padre;
    private final boolean asignado;

    public PrivilegioMenuResponse(
            Integer idMenu,
            String nombre,
            String nombreMostrar,
            String nombreSidebar,
            String paginaAsociada,
            List<String> paginasAsociadas,
            Integer nivel,
            Integer padre,
            boolean asignado) {
        this.idMenu = idMenu;
        this.nombre = nombre;
        this.nombreMostrar = nombreMostrar;
        this.nombreSidebar = nombreSidebar;
        this.paginaAsociada = paginaAsociada;
        this.paginasAsociadas = paginasAsociadas == null ? Collections.emptyList() : paginasAsociadas;
        this.nivel = nivel;
        this.padre = padre;
        this.asignado = asignado;
    }

    public Integer getIdMenu() {
        return idMenu;
    }

    public String getNombre() {
        return nombre;
    }

    public String getNombreMostrar() {
        return nombreMostrar;
    }

    public String getNombreSidebar() {
        return nombreSidebar;
    }

    public String getPaginaAsociada() {
        return paginaAsociada;
    }

    public List<String> getPaginasAsociadas() {
        return paginasAsociadas;
    }

    public Integer getNivel() {
        return nivel;
    }

    public Integer getPadre() {
        return padre;
    }

    public boolean isAsignado() {
        return asignado;
    }
}
