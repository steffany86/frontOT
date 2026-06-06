package com.example.TigoStarSystem.auth.dto;

public class SucursalResponse {
    private final Integer idSucursal;
    private final String sucursal;
    private final String ip;
    private final String baseDeDatos;

    public SucursalResponse(Integer idSucursal, String sucursal, String ip, String baseDeDatos) {
        this.idSucursal = idSucursal;
        this.sucursal = sucursal;
        this.ip = ip;
        this.baseDeDatos = baseDeDatos;
    }

    public Integer getIdSucursal() {
        return idSucursal;
    }

    public String getSucursal() {
        return sucursal;
    }

    public String getIp() {
        return ip;
    }

    public String getBaseDeDatos() {
        return baseDeDatos;
    }
}
