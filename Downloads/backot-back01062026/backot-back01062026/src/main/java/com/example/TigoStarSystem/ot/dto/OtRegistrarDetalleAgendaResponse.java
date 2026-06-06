package com.example.TigoStarSystem.ot.dto;

public class OtRegistrarDetalleAgendaResponse {
    private final Long idVenta;
    private final Integer numeroOrden;
    private final int materialesRegistrados;
    private final int devolucionesRegistradas;

    public OtRegistrarDetalleAgendaResponse(
            Long idVenta,
            Integer numeroOrden,
            int materialesRegistrados,
            int devolucionesRegistradas) {
        this.idVenta = idVenta;
        this.numeroOrden = numeroOrden;
        this.materialesRegistrados = materialesRegistrados;
        this.devolucionesRegistradas = devolucionesRegistradas;
    }

    public Long getIdVenta() {
        return idVenta;
    }

    public Integer getNumeroOrden() {
        return numeroOrden;
    }

    public int getMaterialesRegistrados() {
        return materialesRegistrados;
    }

    public int getDevolucionesRegistradas() {
        return devolucionesRegistradas;
    }
}
