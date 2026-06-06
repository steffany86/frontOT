package com.example.TigoStarSystem.tecnicoiniciojornada.dto;

public class TecnicoCierreJornadaRequest {
    private String codigoCliente;
    private String danoMaterial;
    private String observacionMaterial;
    private String danoPersona;
    private String observacionPersona;
    private String novedadesTrabajo;
    private String observacionNovedades;
    private String ubicacionGeoRef;

    public String getCodigoCliente() {
        return codigoCliente;
    }

    public void setCodigoCliente(String codigoCliente) {
        this.codigoCliente = codigoCliente;
    }

    public String getDanoMaterial() {
        return danoMaterial;
    }

    public void setDanoMaterial(String danoMaterial) {
        this.danoMaterial = danoMaterial;
    }

    public String getObservacionMaterial() {
        return observacionMaterial;
    }

    public void setObservacionMaterial(String observacionMaterial) {
        this.observacionMaterial = observacionMaterial;
    }

    public String getDanoPersona() {
        return danoPersona;
    }

    public void setDanoPersona(String danoPersona) {
        this.danoPersona = danoPersona;
    }

    public String getObservacionPersona() {
        return observacionPersona;
    }

    public void setObservacionPersona(String observacionPersona) {
        this.observacionPersona = observacionPersona;
    }

    public String getNovedadesTrabajo() {
        return novedadesTrabajo;
    }

    public void setNovedadesTrabajo(String novedadesTrabajo) {
        this.novedadesTrabajo = novedadesTrabajo;
    }

    public String getObservacionNovedades() {
        return observacionNovedades;
    }

    public void setObservacionNovedades(String observacionNovedades) {
        this.observacionNovedades = observacionNovedades;
    }

    public String getUbicacionGeoRef() {
        return ubicacionGeoRef;
    }

    public void setUbicacionGeoRef(String ubicacionGeoRef) {
        this.ubicacionGeoRef = ubicacionGeoRef;
    }
}
