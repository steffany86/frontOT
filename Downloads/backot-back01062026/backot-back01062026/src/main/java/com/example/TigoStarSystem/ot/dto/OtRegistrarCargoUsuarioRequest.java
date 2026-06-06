package com.example.TigoStarSystem.ot.dto;

import java.util.List;

public class OtRegistrarCargoUsuarioRequest {
    private String numeroOrden;
    private List<OtCargoUsuarioItemRequest> items;

    public String getNumeroOrden() {
        return numeroOrden;
    }

    public void setNumeroOrden(String numeroOrden) {
        this.numeroOrden = numeroOrden;
    }

    public List<OtCargoUsuarioItemRequest> getItems() {
        return items;
    }

    public void setItems(List<OtCargoUsuarioItemRequest> items) {
        this.items = items;
    }
}
