package com.example.TigoStarSystem.auth.dto;

import java.time.OffsetDateTime;

public class AuthMeResponse {
    private final AuthLoginResponse usuario;
    private final OffsetDateTime expira;
    private final String hostName;

    public AuthMeResponse(AuthLoginResponse usuario, OffsetDateTime expira) {
        this(usuario, expira, null);
    }

    public AuthMeResponse(AuthLoginResponse usuario, OffsetDateTime expira, String hostName) {
        this.usuario = usuario;
        this.expira = expira;
        this.hostName = hostName;
    }

    public AuthLoginResponse getUsuario() {
        return usuario;
    }

    public OffsetDateTime getExpira() {
        return expira;
    }

    public String getHostName() {
        return hostName;
    }
}
