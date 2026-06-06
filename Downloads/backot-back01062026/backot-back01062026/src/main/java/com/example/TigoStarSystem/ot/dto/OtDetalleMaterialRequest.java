package com.example.TigoStarSystem.ot.dto;

import java.math.BigDecimal;

public class OtDetalleMaterialRequest {
    private Integer idProducto;
    private Integer idTipoMaterial;
    private String serie;
    private String chipId;
    private BigDecimal cantidad;
    private Boolean entregado;
    private Boolean requiereIdentificacion;

    public Integer getIdProducto() {
        return idProducto;
    }

    public void setIdProducto(Integer idProducto) {
        this.idProducto = idProducto;
    }

    public Integer getIdTipoMaterial() {
        return idTipoMaterial;
    }

    public void setIdTipoMaterial(Integer idTipoMaterial) {
        this.idTipoMaterial = idTipoMaterial;
    }

    public String getSerie() {
        return serie;
    }

    public void setSerie(String serie) {
        this.serie = serie;
    }

    public String getChipId() {
        return chipId;
    }

    public void setChipId(String chipId) {
        this.chipId = chipId;
    }

    public BigDecimal getCantidad() {
        return cantidad;
    }

    public void setCantidad(BigDecimal cantidad) {
        this.cantidad = cantidad;
    }

    public Boolean getEntregado() {
        return entregado;
    }

    public void setEntregado(Boolean entregado) {
        this.entregado = entregado;
    }

    public Boolean getRequiereIdentificacion() {
        return requiereIdentificacion;
    }

    public void setRequiereIdentificacion(Boolean requiereIdentificacion) {
        this.requiereIdentificacion = requiereIdentificacion;
    }
}
