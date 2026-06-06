package com.example.TigoStarSystem.entity;

public class VendedorEntity {
    private Integer idVendedor;
    private String nombre;
    private Integer idTipoSolicitante;
    private Boolean eEliminado;

    public Integer getIdVendedor() {
        return idVendedor;
    }

    public void setIdVendedor(Integer idVendedor) {
        this.idVendedor = idVendedor;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public Integer getIdTipoSolicitante() {
        return idTipoSolicitante;
    }

    public void setIdTipoSolicitante(Integer idTipoSolicitante) {
        this.idTipoSolicitante = idTipoSolicitante;
    }

    public Boolean getEEliminado() {
        return eEliminado;
    }

    public void setEEliminado(Boolean eEliminado) {
        this.eEliminado = eEliminado;
    }
}
