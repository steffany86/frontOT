package com.example.TigoStarSystem.tecnicoiniciojornada.controller;

import com.example.TigoStarSystem.common.ApiResponse;
import com.example.TigoStarSystem.tecnicoiniciojornada.dto.TecnicoCierreJornadaRequest;
import com.example.TigoStarSystem.tecnicoiniciojornada.dto.TecnicoInicioJornadaCreateRequest;
import com.example.TigoStarSystem.tecnicoiniciojornada.service.TecnicoInicioJornadaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tecnico/inicio-jornada")
public class TecnicoInicioJornadaController {
    private final TecnicoInicioJornadaService service;

    public TecnicoInicioJornadaController(TecnicoInicioJornadaService service) {
        this.service = service;
    }

    @GetMapping("/estado")
    public ResponseEntity<ApiResponse<Map<String, Object>>> estado(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "sucursal", required = false) String sucursal
    ) {
        return ResponseEntity.ok(ApiResponse.of(
                service.estado(token, sucursal),
                "Estado inicio de jornada."
        ));
    }

    @GetMapping("/encargados")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> encargados(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "sucursal", required = false) String sucursal
    ) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarEncargados(token, sucursal),
                "Listado de encargados."
        ));
    }

    @GetMapping("/cierre-estado")
    public ResponseEntity<ApiResponse<Map<String, Object>>> estadoCierre(
            @RequestHeader(value = "X-Session-Token", required = false) String token
    ) {
        return ResponseEntity.ok(ApiResponse.of(
                service.estadoCierre(token),
                "Estado de cierre de jornada."
        ));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> registrar(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestBody TecnicoInicioJornadaCreateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.of(
                service.registrar(token, request),
                "Inicio de jornada registrado."
        ));
    }

    @PostMapping("/cerrar-jornada")
    public ResponseEntity<ApiResponse<Map<String, Object>>> cerrarJornada(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestBody TecnicoCierreJornadaRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.of(
                service.cerrarJornada(token, request),
                "Cierre de jornada registrado."
        ));
    }
}
