package com.example.TigoStarSystem.centralgrupos.dto;

public class CentralGrupoBackupTecnicoRequest {
    private Integer idGrupo;
    private Integer idUsuarioTecnico;
    private String sucursal;

    public Integer getIdGrupo() {
        return idGrupo;
    }

    public void setIdGrupo(Integer idGrupo) {
        this.idGrupo = idGrupo;
    }

    public Integer getIdUsuarioTecnico() {
        return idUsuarioTecnico;
    }

    public void setIdUsuarioTecnico(Integer idUsuarioTecnico) {
        this.idUsuarioTecnico = idUsuarioTecnico;
    }

    public String getSucursal() {
        return sucursal;
    }

    public void setSucursal(String sucursal) {
        this.sucursal = sucursal;
    }
}
