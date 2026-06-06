package com.example.TigoStarSystem.privilegios.dto;

import javax.validation.constraints.NotNull;
import java.util.List;

public class PrivilegioActualizarRequest {
    @NotNull(message = "menuIds es requerido")
    private List<Integer> menuIds;

    public List<Integer> getMenuIds() {
        return menuIds;
    }

    public void setMenuIds(List<Integer> menuIds) {
        this.menuIds = menuIds;
    }
}
