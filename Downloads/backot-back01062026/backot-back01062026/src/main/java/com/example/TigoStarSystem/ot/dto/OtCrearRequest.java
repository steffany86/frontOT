package com.example.TigoStarSystem.ot.dto;

import javax.validation.constraints.NotNull;

public class OtCrearRequest {
    @NotNull(message = "idUsuario es requerido")
    private Integer idUsuario;

    @NotNull(message = "idRuta es requerido")
    private Integer idRuta;

    @NotNull(message = "idTipoServicio es requerido")
    private Integer idTipoServicio;

    private Integer codigoCliente;
    private Integer idEstado;
    private String observacion;
    private Boolean tieneObservacion;
    private Integer idSucursal;
    private String nombreCliente;

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }

    public Integer getIdRuta() {
        return idRuta;
    }

    public void setIdRuta(Integer idRuta) {
        this.idRuta = idRuta;
    }

    public Integer getIdTipoServicio() {
        return idTipoServicio;
    }

    public void setIdTipoServicio(Integer idTipoServicio) {
        this.idTipoServicio = idTipoServicio;
    }

    public Integer getCodigoCliente() {
        return codigoCliente;
    }

    public void setCodigoCliente(Integer codigoCliente) {
        this.codigoCliente = codigoCliente;
    }

    public Integer getIdEstado() {
        return idEstado;
    }

    public void setIdEstado(Integer idEstado) {
        this.idEstado = idEstado;
    }

    public String getObservacion() {
        return observacion;
    }

    public void setObservacion(String observacion) {
        this.observacion = observacion;
    }

    public Boolean getTieneObservacion() {
        return tieneObservacion;
    }

    public void setTieneObservacion(Boolean tieneObservacion) {
        this.tieneObservacion = tieneObservacion;
    }

    public Integer getIdSucursal() {
        return idSucursal;
    }

    public void setIdSucursal(Integer idSucursal) {
        this.idSucursal = idSucursal;
    }

    public String getNombreCliente() {
        return nombreCliente;
    }

    public void setNombreCliente(String nombreCliente) {
        this.nombreCliente = nombreCliente;
    }
}
