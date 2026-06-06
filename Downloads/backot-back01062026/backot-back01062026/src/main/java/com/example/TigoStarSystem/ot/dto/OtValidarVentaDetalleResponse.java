package com.example.TigoStarSystem.ot.dto;

import java.time.LocalDate;

public class OtValidarVentaDetalleResponse {
    private final LocalDate fecha;
    private final Integer nroOT;
    private final Integer numeroCliente;
    private final Long idVenta;
    private final Integer idRuta;
    private final Boolean existeVenta;
    private final Integer cantidadVentas;
    private final Boolean tieneDetalle;
    private final Boolean tieneDetalleEnCodigoVenta;
    private final Integer cantidadDetalles;
    private final Boolean addMaterialOCargoUsuario;
    private final Boolean habilitarCargarMaterial;

    public OtValidarVentaDetalleResponse(
            LocalDate fecha,
            Integer nroOT,
            Integer numeroCliente,
            Long idVenta,
            Integer idRuta,
            Boolean existeVenta,
            Integer cantidadVentas,
            Boolean tieneDetalle,
            Boolean tieneDetalleEnCodigoVenta,
            Integer cantidadDetalles,
            Boolean addMaterialOCargoUsuario,
            Boolean habilitarCargarMaterial) {
        this.fecha = fecha;
        this.nroOT = nroOT;
        this.numeroCliente = numeroCliente;
        this.idVenta = idVenta;
        this.idRuta = idRuta;
        this.existeVenta = existeVenta;
        this.cantidadVentas = cantidadVentas;
        this.tieneDetalle = tieneDetalle;
        this.tieneDetalleEnCodigoVenta = tieneDetalleEnCodigoVenta;
        this.cantidadDetalles = cantidadDetalles;
        this.addMaterialOCargoUsuario = addMaterialOCargoUsuario;
        this.habilitarCargarMaterial = habilitarCargarMaterial;
    }

    public LocalDate getFecha() {
        return fecha;
    }

    public Integer getNroOT() {
        return nroOT;
    }

    public Integer getNumeroCliente() {
        return numeroCliente;
    }

    public Long getIdVenta() {
        return idVenta;
    }

    public Integer getIdRuta() {
        return idRuta;
    }

    public Boolean getExisteVenta() {
        return existeVenta;
    }

    public Integer getCantidadVentas() {
        return cantidadVentas;
    }

    public Boolean getTieneDetalle() {
        return tieneDetalle;
    }

    public Boolean getTieneDetalleEnCodigoVenta() {
        return tieneDetalleEnCodigoVenta;
    }

    public Integer getCantidadDetalles() {
        return cantidadDetalles;
    }

    public Boolean getAddMaterialOCargoUsuario() {
        return addMaterialOCargoUsuario;
    }

    public Boolean getHabilitarCargarMaterial() {
        return habilitarCargarMaterial;
    }
}
