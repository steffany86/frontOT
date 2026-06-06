package com.example.TigoStarSystem.supervisor.dto;

public class ConformacionCuadrillaRelacionRequest {
    private Integer idRuta;
    private Integer idTecnicoAuxiliar;
    private String auxiliar;
    private Integer idUsuarioDigitador;
    private String digitador;
    private String sucursal;
    private Boolean activo;

    public Integer getIdRuta() {
        return idRuta;
    }

    public void setIdRuta(Integer idRuta) {
        this.idRuta = idRuta;
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

    public String getSucursal() {
        return sucursal;
    }

    public void setSucursal(String sucursal) {
        this.sucursal = sucursal;
    }

    public Boolean getActivo() {
        return activo;
    }

    public void setActivo(Boolean activo) {
        this.activo = activo;
    }
}
