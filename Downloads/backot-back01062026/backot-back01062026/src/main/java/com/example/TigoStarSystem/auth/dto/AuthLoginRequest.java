package com.example.TigoStarSystem.auth.dto;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

public class AuthLoginRequest {
    @NotBlank(message = "usuario es requerido")
    private String usuario;

    @NotBlank(message = "password es requerido")
    private String password;

    @NotNull(message = "idSucursal es requerido")
    private Integer idSucursal;

    public String getUsuario() {
        return usuario;
    }

    public void setUsuario(String usuario) {
        this.usuario = usuario;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Integer getIdSucursal() {
        return idSucursal;
    }

    public void setIdSucursal(Integer idSucursal) {
        this.idSucursal = idSucursal;
    }
}

