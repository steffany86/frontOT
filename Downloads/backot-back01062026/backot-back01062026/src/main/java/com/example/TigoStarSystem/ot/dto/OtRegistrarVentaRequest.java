package com.example.TigoStarSystem.ot.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import java.math.BigDecimal;

public class OtRegistrarVentaRequest {
    @NotNull(message = "idUsuario es requerido")
    private Integer idUsuario;

    @NotNull(message = "idVendedor es requerido")
    private Integer idVendedor;

    @NotNull(message = "idGrupo es requerido")
    private Integer idGrupo;

    @NotNull(message = "idTipoServicio es requerido")
    private Integer idTipoServicio;

    @NotNull(message = "ordenTrabajo es requerido")
    private Integer ordenTrabajo;

    @NotNull(message = "idEstado es requerido")
    private Integer idEstado;

    @NotNull(message = "codigoCliente es requerido")
    private Integer codigoCliente;

    private Integer idSucursal;
    private Integer idUsuarioE;
    private String observacion;
    private BigDecimal total;
    private Boolean eEliminado;
    private Boolean tieneObservacion;

    @NotBlank(message = "nombre es requerido")
    private String nombre;

    @NotBlank(message = "origen es requerido")
    private String origen;

    private BigDecimal latitud;
    private BigDecimal longitud;

    @NotBlank(message = "nodo es requerido")
    @Pattern(regexp = "^[A-Za-z]{3}\\d{3,4}$", message = "nodo debe tener formato 3 letras y 3 o 4 numeros, ejemplo SCZ123 o SCZ1234")
    private String nodo;

    @NotBlank(message = "ramal es requerido")
    private String ramal;

    @NotNull(message = "tap es requerido")
    private Integer tap;

    @NotNull(message = "boca es requerido")
    private Integer boca;
    private String tipoTecnologia;
    @JsonAlias({"CheckPlantaExterna", "check_planta_externa"})
    private Boolean checkPlantaExterna;
    @JsonAlias({"TieneDetalle", "tiene_detalle"})
    private Boolean tieneDetalle;

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

    public Integer getIdGrupo() {
        return idGrupo;
    }

    public void setIdGrupo(Integer idGrupo) {
        this.idGrupo = idGrupo;
    }

    public Integer getIdTipoServicio() {
        return idTipoServicio;
    }

    public void setIdTipoServicio(Integer idTipoServicio) {
        this.idTipoServicio = idTipoServicio;
    }

    public Integer getOrdenTrabajo() {
        return ordenTrabajo;
    }

    public void setOrdenTrabajo(Integer ordenTrabajo) {
        this.ordenTrabajo = ordenTrabajo;
    }

    public Integer getIdEstado() {
        return idEstado;
    }

    public void setIdEstado(Integer idEstado) {
        this.idEstado = idEstado;
    }

    public Integer getCodigoCliente() {
        return codigoCliente;
    }

    public void setCodigoCliente(Integer codigoCliente) {
        this.codigoCliente = codigoCliente;
    }

    public Integer getIdSucursal() {
        return idSucursal;
    }

    public void setIdSucursal(Integer idSucursal) {
        this.idSucursal = idSucursal;
    }

    public Integer getIdUsuarioE() {
        return idUsuarioE;
    }

    public void setIdUsuarioE(Integer idUsuarioE) {
        this.idUsuarioE = idUsuarioE;
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

    public Boolean getEEliminado() {
        return eEliminado;
    }

    public void setEEliminado(Boolean eEliminado) {
        this.eEliminado = eEliminado;
    }

    public Boolean getTieneObservacion() {
        return tieneObservacion;
    }

    public void setTieneObservacion(Boolean tieneObservacion) {
        this.tieneObservacion = tieneObservacion;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getOrigen() {
        return origen;
    }

    public void setOrigen(String origen) {
        this.origen = origen;
    }

    public BigDecimal getLatitud() {
        return latitud;
    }

    public void setLatitud(BigDecimal latitud) {
        this.latitud = latitud;
    }

    public BigDecimal getLongitud() {
        return longitud;
    }

    public void setLongitud(BigDecimal longitud) {
        this.longitud = longitud;
    }

    public String getNodo() {
        return nodo;
    }

    public void setNodo(String nodo) {
        this.nodo = nodo;
    }

    public String getRamal() {
        return ramal;
    }

    public void setRamal(String ramal) {
        this.ramal = ramal;
    }

    public Integer getTap() {
        return tap;
    }

    public void setTap(Integer tap) {
        this.tap = tap;
    }

    public Integer getBoca() {
        return boca;
    }

    public void setBoca(Integer boca) {
        this.boca = boca;
    }

    public String getTipoTecnologia() {
        return tipoTecnologia;
    }

    public void setTipoTecnologia(String tipoTecnologia) {
        this.tipoTecnologia = tipoTecnologia;
    }

    public Boolean getCheckPlantaExterna() {
        return checkPlantaExterna;
    }

    public void setCheckPlantaExterna(Boolean checkPlantaExterna) {
        this.checkPlantaExterna = checkPlantaExterna;
    }

    public Boolean getTieneDetalle() {
        return tieneDetalle;
    }

    public void setTieneDetalle(Boolean tieneDetalle) {
        this.tieneDetalle = tieneDetalle;
    }
}
