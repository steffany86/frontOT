package com.example.TigoStarSystem.centralgrupos.dto;

import java.util.List;

public class CentralGrupoCambiarSupervisorMasivoRequest {
    private Integer idSupervisorOrigen;
    private Integer idSupervisorDestino;
    private List<Integer> idGrupos;
    private String sucursal;

    public Integer getIdSupervisorOrigen() {
        return idSupervisorOrigen;
    }

    public void setIdSupervisorOrigen(Integer idSupervisorOrigen) {
        this.idSupervisorOrigen = idSupervisorOrigen;
    }

    public Integer getIdSupervisorDestino() {
        return idSupervisorDestino;
    }

    public void setIdSupervisorDestino(Integer idSupervisorDestino) {
        this.idSupervisorDestino = idSupervisorDestino;
    }

    public List<Integer> getIdGrupos() {
        return idGrupos;
    }

    public void setIdGrupos(List<Integer> idGrupos) {
        this.idGrupos = idGrupos;
    }

    public String getSucursal() {
        return sucursal;
    }

    public void setSucursal(String sucursal) {
        this.sucursal = sucursal;
    }
}

