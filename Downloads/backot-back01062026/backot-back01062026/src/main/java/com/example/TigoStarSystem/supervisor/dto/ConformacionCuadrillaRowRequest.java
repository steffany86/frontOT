package com.example.TigoStarSystem.supervisor.dto;

import java.time.LocalDate;

public class ConformacionCuadrillaRowRequest {
    private LocalDate fecha;
    private String estado;
    private String actividad;
    private Integer idTecnico;
    private String cuentaSf;
    private String salesforce;
    private String habilidad;
    private String vehiculo;
    private String grupo;
    private String almacen;
    private String grupoDigitacion;
    private Integer idUsuarioDigitador;
    private String digitador;
    private String tecnico;
    private Integer idTecnicoAuxiliar;
    private String auxiliar;
    private Integer idUsuarioSupervisor;
    private String supervisorACargo;
    private String sucursal;
    private String observacion;
    private Integer idUsuarioRegistra;

    public LocalDate getFecha() {
        return fecha;
    }

    public void setFecha(LocalDate fecha) {
        this.fecha = fecha;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public String getActividad() {
        return actividad;
    }

    public void setActividad(String actividad) {
        this.actividad = actividad;
    }

    public Integer getIdTecnico() {
        return idTecnico;
    }

    public void setIdTecnico(Integer idTecnico) {
        this.idTecnico = idTecnico;
    }

    public String getCuentaSf() {
        return cuentaSf;
    }

    public void setCuentaSf(String cuentaSf) {
        this.cuentaSf = cuentaSf;
    }

    public String getSalesforce() {
        return salesforce;
    }

    public void setSalesforce(String salesforce) {
        this.salesforce = salesforce;
    }

    public String getHabilidad() {
        return habilidad;
    }

    public void setHabilidad(String habilidad) {
        this.habilidad = habilidad;
    }

    public String getVehiculo() {
        return vehiculo;
    }

    public void setVehiculo(String vehiculo) {
        this.vehiculo = vehiculo;
    }

    public String getGrupo() {
        return grupo;
    }

    public void setGrupo(String grupo) {
        this.grupo = grupo;
    }

    public String getAlmacen() {
        return almacen;
    }

    public void setAlmacen(String almacen) {
        this.almacen = almacen;
    }

    public String getGrupoDigitacion() {
        return grupoDigitacion;
    }

    public void setGrupoDigitacion(String grupoDigitacion) {
        this.grupoDigitacion = grupoDigitacion;
    }

    public Integer getIdUsuarioDigitador() {
        return idUsuarioDigitador;
    }

    public void setIdUsuarioDigitador(Integer idUsuarioDigitador) {
        this.idUsuarioDigitador = idUsuarioDigitador;
    }

    public String getDigitador() {
        return digitador;
    }

    public void setDigitador(String digitador) {
        this.digitador = digitador;
    }

    public String getTecnico() {
        return tecnico;
    }

    public void setTecnico(String tecnico) {
        this.tecnico = tecnico;
    }

    public Integer getIdTecnicoAuxiliar() {
        return idTecnicoAuxiliar;
    }

    public void setIdTecnicoAuxiliar(Integer idTecnicoAuxiliar) {
        this.idTecnicoAuxiliar = idTecnicoAuxiliar;
    }

    public String getAuxiliar() {
        return auxiliar;
    }

    public void setAuxiliar(String auxiliar) {
        this.auxiliar = auxiliar;
    }

    public Integer getIdUsuarioSupervisor() {
        return idUsuarioSupervisor;
    }

    public void setIdUsuarioSupervisor(Integer idUsuarioSupervisor) {
        this.idUsuarioSupervisor = idUsuarioSupervisor;
    }

    public String getSupervisorACargo() {
        return supervisorACargo;
    }

    public void setSupervisorACargo(String supervisorACargo) {
        this.supervisorACargo = supervisorACargo;
    }

    public String getSucursal() {
        return sucursal;
    }

    public void setSucursal(String sucursal) {
        this.sucursal = sucursal;
    }

    public String getObservacion() {
        return observacion;
    }

    public void setObservacion(String observacion) {
        this.observacion = observacion;
    }

    public Integer getIdUsuarioRegistra() {
        return idUsuarioRegistra;
    }

    public void setIdUsuarioRegistra(Integer idUsuarioRegistra) {
        this.idUsuarioRegistra = idUsuarioRegistra;
    }
}
