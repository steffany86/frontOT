package com.example.TigoStarSystem.privilegios.dto;

import java.util.List;

public class PrivilegioRolDetalleResponse {
    private final Integer idRol;
    private final String rol;
    private final List<PrivilegioMenuResponse> menus;

    public PrivilegioRolDetalleResponse(Integer idRol, String rol, List<PrivilegioMenuResponse> menus) {
        this.idRol = idRol;
        this.rol = rol;
        this.menus = menus;
    }

    public Integer getIdRol() {
        return idRol;
    }

    public String getRol() {
        return rol;
    }

    public List<PrivilegioMenuResponse> getMenus() {
        return menus;
    }
}
