package com.example.TigoStarSystem.auth.dto;

public class AuthLoginResponse {
    private final Integer idUsuario;
    private final String nombre;
    private final String loggin;
    private final String rol;
    private final Integer idRol;
    private final Integer idSucursal;
    private final Boolean necesitaCambio;
    private final java.time.LocalDateTime ultimaModificacion;

    public AuthLoginResponse(Integer idUsuario, String nombre, String rol, Integer idRol, Integer idSucursal) {
        this(idUsuario, nombre, null, rol, idRol, idSucursal, null, null);
    }

    public AuthLoginResponse(
            Integer idUsuario,
            String nombre,
            String loggin,
            String rol,
            Integer idRol,
            Integer idSucursal,
            Boolean necesitaCambio,
            java.time.LocalDateTime ultimaModificacion
    ) {
        this.idUsuario = idUsuario;
        this.nombre = nombre;
        this.loggin = loggin;
        this.rol = rol;
        this.idRol = idRol;
        this.idSucursal = idSucursal;
        this.necesitaCambio = necesitaCambio;
        this.ultimaModificacion = ultimaModificacion;
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public String getNombre() {
        return nombre;
    }

    public String getLoggin() {
        return loggin;
    }

    public String getRol() {
        return rol;
    }

    public Integer getIdRol() {
        return idRol;
    }

    public Integer getIdSucursal() {
        return idSucursal;
    }

    public Boolean getNecesitaCambio() {
        return necesitaCambio;
    }

    public java.time.LocalDateTime getUltimaModificacion() {
        return ultimaModificacion;
    }
}
