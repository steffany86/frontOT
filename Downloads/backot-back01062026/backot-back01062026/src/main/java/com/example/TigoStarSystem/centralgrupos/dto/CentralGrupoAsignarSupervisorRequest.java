package com.example.TigoStarSystem.centralgrupos.dto;

public class CentralGrupoAsignarSupervisorRequest {
    private Integer idGrupo;
    private Integer idUsuarioSupervisor;
    private String sucursal;

    public Integer getIdGrupo() {
        return idGrupo;
    }

    public void setIdGrupo(Integer idGrupo) {
        this.idGrupo = idGrupo;
    }

    public Integer getIdUsuarioSupervisor() {
        return idUsuarioSupervisor;
    }

    public void setIdUsuarioSupervisor(Integer idUsuarioSupervisor) {
        this.idUsuarioSupervisor = idUsuarioSupervisor;
    }

    public String getSucursal() {
        return sucursal;
    }

    public void setSucursal(String sucursal) {
        this.sucursal = sucursal;
    }
}

