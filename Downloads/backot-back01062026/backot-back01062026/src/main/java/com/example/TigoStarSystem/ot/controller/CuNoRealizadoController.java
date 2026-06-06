package com.example.TigoStarSystem.ot.controller;

import com.example.TigoStarSystem.common.ApiResponse;
import com.example.TigoStarSystem.ot.dto.CuNoRealizadoCreateRequest;
import com.example.TigoStarSystem.ot.service.CuNoRealizadoService;
import javax.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Validated
@RestController
@RequestMapping("/cu-no-realizado")
public class CuNoRealizadoController {
    private final CuNoRealizadoService service;

    public CuNoRealizadoController(CuNoRealizadoService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Object>> registrar(@Valid @RequestBody CuNoRealizadoCreateRequest request) {
        service.registrar(request);
        return ResponseEntity.ok(ApiResponse.of(null, "Registro solicitado."));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listar() {
        return ResponseEntity.ok(ApiResponse.of(
                service.listar(),
                "Listado cargo usuario no realizado."
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> obtenerPorId(@PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.of(
                service.obtenerPorId(id),
                "Detalle cargo usuario no realizado."
        ));
    }
}

