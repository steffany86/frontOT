package com.example.TigoStarSystem.auth.controller;

import com.example.TigoStarSystem.auth.dto.AuthMeResponse;
import com.example.TigoStarSystem.auth.service.AuthService;
import com.example.TigoStarSystem.common.ApiResponse;
import com.example.TigoStarSystem.privilegios.dto.PrivilegioUsuarioResponse;
import com.example.TigoStarSystem.privilegios.service.PrivilegioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthPermisosController {
    private final AuthService authService;
    private final PrivilegioService privilegioService;

    public AuthPermisosController(AuthService authService, PrivilegioService privilegioService) {
        this.authService = authService;
        this.privilegioService = privilegioService;
    }

    @GetMapping("/permisos")
    public ResponseEntity<ApiResponse<PrivilegioUsuarioResponse>> permisos(
            @RequestHeader(value = "X-Session-Token", required = false) String token) {
        AuthMeResponse me = authService.me(token);
        boolean administrador = authService.esAdministrador(me.getUsuario());
        PrivilegioUsuarioResponse response = privilegioService.obtenerPermisosUsuario(me.getUsuario(), administrador);
        return ResponseEntity.ok(ApiResponse.of(response, "Permisos del usuario."));
    }
}
