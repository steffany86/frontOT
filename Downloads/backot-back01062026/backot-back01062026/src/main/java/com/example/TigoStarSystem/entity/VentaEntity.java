package com.example.TigoStarSystem.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class VentaEntity {
    private Integer idVenta;
    private Integer idUsuario;
    private Integer idVendedor;
    private Integer idRuta;
    private Integer idTipoServicio;
    private LocalDateTime fechaEjecucion;
    private LocalDateTime fechaRegistro;
    private Integer ordenTrabajo;
    private String observacion;
    private BigDecimal total;
    private Integer idUsuarioE;
    private Boolean eEliminado;
    private String nombre;
    private Integer idEstado;
    private Integer idSucursal;
    private Integer codigoCliente;
    private Boolean tieneObservacion;

    public Integer getIdVenta() {
        return idVenta;
    }

    public void setIdVenta(Integer idVenta) {
        this.idVenta = idVenta;
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }

    public Integer getIdVendedor() {
        return idVendedor;
    }

    public void setIdVendedor(Integer idVendedor) {
        this.idVendedor = idVendedor;
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

    public LocalDateTime getFechaEjecucion() {
        return fechaEjecucion;
    }

    public void setFechaEjecucion(LocalDateTime fechaEjecucion) {
        this.fechaEjecucion = fechaEjecucion;
    }

    public LocalDateTime getFechaRegistro() {
        return fechaRegistro;
    }

    public void setFechaRegistro(LocalDateTime fechaRegistro) {
        this.fechaRegistro = fechaRegistro;
    }

    public Integer getOrdenTrabajo() {
        return ordenTrabajo;
    }

    public void setOrdenTrabajo(Integer ordenTrabajo) {
        this.ordenTrabajo = ordenTrabajo;
    }

    public String getObservacion() {
        return observacion;
    }

    public void setObservacion(String observacion) {
        this.observacion = observacion;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public Integer getIdUsuarioE() {
        return idUsuarioE;
    }

    public void setIdUsuarioE(Integer idUsuarioE) {
        this.idUsuarioE = idUsuarioE;
    }

    public Boolean getEEliminado() {
        return eEliminado;
    }

    public void setEEliminado(Boolean eEliminado) {
        this.eEliminado = eEliminado;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public Integer getIdEstado() {
        return idEstado;
    }

    public void setIdEstado(Integer idEstado) {
        this.idEstado = idEstado;
    }

    public Integer getIdSucursal() {
        return idSucursal;
    }

    public void setIdSucursal(Integer idSucursal) {
        this.idSucursal = idSucursal;
    }

    public Integer getCodigoCliente() {
        return codigoCliente;
    }

    public void setCodigoCliente(Integer codigoCliente) {
        this.codigoCliente = codigoCliente;
    }

    public Boolean getTieneObservacion() {
        return tieneObservacion;
    }

    public void setTieneObservacion(Boolean tieneObservacion) {
        this.tieneObservacion = tieneObservacion;
    }
}
