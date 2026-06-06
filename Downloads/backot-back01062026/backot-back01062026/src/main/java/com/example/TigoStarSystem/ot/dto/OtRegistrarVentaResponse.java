package com.example.TigoStarSystem.ot.dto;

import java.math.BigDecimal;

public class OtRegistrarVentaResponse {
    private final Integer idVenta;
    private final Integer ordenTrabajo;
    private final Integer codigoCliente;
    private final Integer idSucursal;
    private final String origen;
    private final BigDecimal latitud;
    private final BigDecimal longitud;
    private final String rutaPdf;

    public OtRegistrarVentaResponse(
            Integer idVenta,
            Integer ordenTrabajo,
            Integer codigoCliente,
            Integer idSucursal,
            String origen,
            BigDecimal latitud,
            BigDecimal longitud,
            String rutaPdf) {
        this.idVenta = idVenta;
        this.ordenTrabajo = ordenTrabajo;
        this.codigoCliente = codigoCliente;
        this.idSucursal = idSucursal;
        this.origen = origen;
        this.latitud = latitud;
        this.longitud = longitud;
        this.rutaPdf = rutaPdf;
    }

    public Integer getIdVenta() {
        return idVenta;
    }

    public Integer getOrdenTrabajo() {
        return ordenTrabajo;
    }

    public Integer getCodigoCliente() {
        return codigoCliente;
    }

    public Integer getIdSucursal() {
        return idSucursal;
    }

    public String getOrigen() {
        return origen;
    }

    public BigDecimal getLatitud() {
        return latitud;
    }

    public BigDecimal getLongitud() {
        return longitud;
    }

    public String getRutaPdf() {
        return rutaPdf;
    }
}
