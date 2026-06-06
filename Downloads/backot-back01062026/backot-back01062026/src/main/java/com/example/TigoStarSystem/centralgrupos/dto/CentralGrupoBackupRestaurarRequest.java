package com.example.TigoStarSystem.centralgrupos.dto;

public class CentralGrupoBackupRestaurarRequest {
    private Integer idGrupo;
    private String sucursal;

    public Integer getIdGrupo() {
        return idGrupo;
    }

    public void setIdGrupo(Integer idGrupo) {
        this.idGrupo = idGrupo;
    }

    public String getSucursal() {
        return sucursal;
    }

    public void setSucursal(String sucursal) {
        this.sucursal = sucursal;
    }
}
