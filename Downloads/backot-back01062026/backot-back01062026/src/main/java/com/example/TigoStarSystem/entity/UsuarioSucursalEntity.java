package com.example.TigoStarSystem.entity;

public class UsuarioSucursalEntity {
    private Integer idUsuario;
    private Integer idSucursal;
    private Boolean eEliminado;

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }

    public Integer getIdSucursal() {
        return idSucursal;
    }

    public void setIdSucursal(Integer idSucursal) {
        this.idSucursal = idSucursal;
    }

    public Boolean getEEliminado() {
        return eEliminado;
    }

    public void setEEliminado(Boolean eEliminado) {
        this.eEliminado = eEliminado;
    }
}
