package com.example.TigoStarSystem.auth.service;

import com.example.TigoStarSystem.auth.dto.AuthLoginResponse;

import java.time.OffsetDateTime;

public class AuthSession {
    private final String token;
    private final AuthLoginResponse usuario;
    private final OffsetDateTime expira;

    /**
     * Crea una sesion autenticada con token, usuario y fecha de expiracion.
     */
    

    public AuthSession(String token, AuthLoginResponse usuario, OffsetDateTime expira) {
        this.token = token;
        this.usuario = usuario;
        this.expira = expira;
    }

    /**
     * Devuelve el token unico de la sesion.
     */


    public String getToken() {
        return token;
    }

    /**
     * Devuelve la informacion del usuario autenticado.
     */


    public AuthLoginResponse getUsuario() {
        return usuario;
    }

    /**
     * Devuelve la fecha/hora limite de validez de la sesion.
     */

    
    public OffsetDateTime getExpira() {
        return expira;
    }
}
