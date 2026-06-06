package com.example.TigoStarSystem.ot.dto;

public class OtCrearResponse {
    private final Integer idVenta;
    private final Integer ordenTrabajo;

    public OtCrearResponse(Integer idVenta, Integer ordenTrabajo) {
        this.idVenta = idVenta;
        this.ordenTrabajo = ordenTrabajo;
    }

    public Integer getIdVenta() {
        return idVenta;
    }

    public Integer getOrdenTrabajo() {
        return ordenTrabajo;
    }
}
