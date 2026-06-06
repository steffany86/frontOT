package com.example.TigoStarSystem.privilegios.dto;

import java.util.List;

public class PrivilegioUsuarioResponse {
    private final Integer idUsuario;
    private final Integer idRol;
    private final String rol;
    private final boolean administrador;
    private final List<Integer> menuIds;
    private final List<PrivilegioMenuResponse> menus;

    public PrivilegioUsuarioResponse(
            Integer idUsuario,
            Integer idRol,
            String rol,
            boolean administrador,
            List<Integer> menuIds,
            List<PrivilegioMenuResponse> menus) {
        this.idUsuario = idUsuario;
        this.idRol = idRol;
        this.rol = rol;
        this.administrador = administrador;
        this.menuIds = menuIds;
        this.menus = menus;
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public Integer getIdRol() {
        return idRol;
    }

    public String getRol() {
        return rol;
    }

    public boolean isAdministrador() {
        return administrador;
    }

    public List<Integer> getMenuIds() {
        return menuIds;
    }

    public List<PrivilegioMenuResponse> getMenus() {
        return menus;
    }
}
