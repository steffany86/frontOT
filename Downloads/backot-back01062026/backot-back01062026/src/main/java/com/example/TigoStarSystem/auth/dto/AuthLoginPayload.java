package com.example.TigoStarSystem.auth.dto;

public class AuthLoginPayload {
    private final AuthLoginResponse usuario;
    private final String token;

    public AuthLoginPayload(AuthLoginResponse usuario, String token) {
        this.usuario = usuario;
        this.token = token;
    }

    public AuthLoginResponse getUsuario() {
        return usuario;
    }

    public String getToken() {
        return token;
    }
}
