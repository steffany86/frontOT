package com.example.TigoStarSystem.privilegios.dto;

public class PrivilegioMenuSidebarNombreResponse {
    private final Integer idMenu;
    private final String nombre;
    private final String nombreSidebar;

    public PrivilegioMenuSidebarNombreResponse(Integer idMenu, String nombre, String nombreSidebar) {
        this.idMenu = idMenu;
        this.nombre = nombre;
        this.nombreSidebar = nombreSidebar;
    }

    public Integer getIdMenu() {
        return idMenu;
    }

    public String getNombre() {
        return nombre;
    }

    public String getNombreSidebar() {
        return nombreSidebar;
    }
}

