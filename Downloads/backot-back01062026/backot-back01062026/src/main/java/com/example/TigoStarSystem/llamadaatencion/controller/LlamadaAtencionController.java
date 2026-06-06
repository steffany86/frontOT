package com.example.TigoStarSystem.llamadaatencion.controller;

import com.example.TigoStarSystem.common.ApiResponse;
import com.example.TigoStarSystem.llamadaatencion.dto.LlamadaAtencionCrearRequest;
import com.example.TigoStarSystem.llamadaatencion.service.LlamadaAtencionService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Validated
@RestController
@RequestMapping("/supervisor/llamada-atencion")
public class LlamadaAtencionController {
    private final LlamadaAtencionService service;

    public LlamadaAtencionController(LlamadaAtencionService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listar(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "idTecnico", required = false) String idTecnico,
            @RequestParam(value = "fechaDesde", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(value = "fechaHasta", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta,
            @RequestParam(value = "limite", required = false) Integer limite) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listar(idTecnico, fechaDesde, fechaHasta, limite, token),
                "Listado de llamadas de atencion."
        ));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> registrar(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @Valid @RequestBody LlamadaAtencionCrearRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                service.registrar(request, token),
                "Llamada de atencion registrada."
        ));
    }

    @GetMapping("/tipos-comunicacion")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarTiposComunicacion(
            @RequestHeader(value = "X-Session-Token", required = false) String token) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarTiposComunicacion(token),
                "Listado de tipos de comunicacion."
        ));
    }

    @GetMapping(value = "/firma")
    public ResponseEntity<byte[]> obtenerFirma(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "path") String path) {
        com.example.TigoStarSystem.llamadaatencion.service.LlamadaAtencionFirmaStorageService.FirmaFile file =
                service.obtenerFirma(path, token);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.getContentType()))
                .body(file.getContent());
    }

    @GetMapping("/tecnicos")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarTecnicos(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarTecnicos(q, limit, sucursal, token),
                "Listado de tecnicos para llamada de atencion."
        ));
    }
}
