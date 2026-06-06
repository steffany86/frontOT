package com.example.TigoStarSystem.auth.controller;

import com.example.TigoStarSystem.auth.dto.AuthLoginRequest;
import com.example.TigoStarSystem.auth.dto.AuthLoginPayload;
import com.example.TigoStarSystem.auth.dto.AuthLoginResponse;
import com.example.TigoStarSystem.auth.dto.AuthMeResponse;
import com.example.TigoStarSystem.auth.dto.ChangePasswordRequest;
import com.example.TigoStarSystem.auth.dto.SucursalResponse;
import com.example.TigoStarSystem.auth.service.AuthSession;
import com.example.TigoStarSystem.auth.service.AuthService;
import com.example.TigoStarSystem.common.ApiResponse;
import java.util.List;
import javax.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/auth")
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthLoginPayload>> login(@Valid @RequestBody AuthLoginRequest request) {
        AuthSession session = authService.login(request);
        logger.info("User {} logged in successfully.");
        AuthLoginPayload payload = new AuthLoginPayload(session.getUsuario(), session.getToken());
        return ResponseEntity.ok()
                .header("X-Session-Token", session.getToken())
                .body(ApiResponse.of(payload, "Login exitoso."));
    }

    @GetMapping("/sucursales")
    public ResponseEntity<ApiResponse<List<SucursalResponse>>> listarSucursales() {
        logger.info("Request GET /auth/sucursales");
        List<SucursalResponse> sucursales = authService.listarSucursales();
        return ResponseEntity.ok(ApiResponse.of(sucursales, "Listado de sucursales."));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthMeResponse>> me(
            @RequestHeader(value = "X-Session-Token", required = false) String token) {
        AuthMeResponse response = authService.me(token);
        return ResponseEntity.ok(ApiResponse.of(response, "Sesion valida."));
    }

    @PostMapping("/cambiar-password")
    public ResponseEntity<ApiResponse<Void>> cambiarPassword(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.cambiarPassword(token, request);
        return ResponseEntity.ok(ApiResponse.of(null, "Password actualizada correctamente."));
    }
}
