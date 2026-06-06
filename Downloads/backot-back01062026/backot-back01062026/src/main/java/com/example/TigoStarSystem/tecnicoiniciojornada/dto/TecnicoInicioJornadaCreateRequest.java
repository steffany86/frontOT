package com.example.TigoStarSystem.tecnicoiniciojornada.dto;

import java.time.LocalDate;

public class TecnicoInicioJornadaCreateRequest {
    private Integer idAuxiliar;
    private Integer idEncargado;
    private String capacitado;
    private String charla;
    private String botiquin;
    private String extintor;
    private LocalDate fechaVencimiento;
    private String equipoEpp;
    private String estadoEpp;
    private String apr;
    private String escalera;
    private String anclaje;
    private String imagen;
    private String ubicacionGeoRef;
    private String sucursal;

    public Integer getIdAuxiliar() {
        return idAuxiliar;
    }

    public void setIdAuxiliar(Integer idAuxiliar) {
        this.idAuxiliar = idAuxiliar;
    }

    public Integer getIdEncargado() {
        return idEncargado;
    }

    public void setIdEncargado(Integer idEncargado) {
        this.idEncargado = idEncargado;
    }

    public String getCapacitado() {
        return capacitado;
    }

    public void setCapacitado(String capacitado) {
        this.capacitado = capacitado;
    }

    public String getCharla() {
        return charla;
    }

    public void setCharla(String charla) {
        this.charla = charla;
    }

    public String getBotiquin() {
        return botiquin;
    }

    public void setBotiquin(String botiquin) {
        this.botiquin = botiquin;
    }

    public String getExtintor() {
        return extintor;
    }

    public void setExtintor(String extintor) {
        this.extintor = extintor;
    }

    public LocalDate getFechaVencimiento() {
        return fechaVencimiento;
    }

    public void setFechaVencimiento(LocalDate fechaVencimiento) {
        this.fechaVencimiento = fechaVencimiento;
    }

    public String getEquipoEpp() {
        return equipoEpp;
    }

    public void setEquipoEpp(String equipoEpp) {
        this.equipoEpp = equipoEpp;
    }

    public String getEstadoEpp() {
        return estadoEpp;
    }

    public void setEstadoEpp(String estadoEpp) {
        this.estadoEpp = estadoEpp;
    }

    public String getApr() {
        return apr;
    }

    public void setApr(String apr) {
        this.apr = apr;
    }

    public String getEscalera() {
        return escalera;
    }

    public void setEscalera(String escalera) {
        this.escalera = escalera;
    }

    public String getAnclaje() {
        return anclaje;
    }

    public void setAnclaje(String anclaje) {
        this.anclaje = anclaje;
    }

    public String getImagen() {
        return imagen;
    }

    public void setImagen(String imagen) {
        this.imagen = imagen;
    }

    public String getUbicacionGeoRef() {
        return ubicacionGeoRef;
    }

    public void setUbicacionGeoRef(String ubicacionGeoRef) {
        this.ubicacionGeoRef = ubicacionGeoRef;
    }

    public String getSucursal() {
        return sucursal;
    }

    public void setSucursal(String sucursal) {
        this.sucursal = sucursal;
    }
}
