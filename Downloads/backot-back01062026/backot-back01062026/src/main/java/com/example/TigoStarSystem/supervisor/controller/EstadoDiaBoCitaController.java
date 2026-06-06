package com.example.TigoStarSystem.supervisor.controller;

import com.example.TigoStarSystem.common.ApiResponse;
import com.example.TigoStarSystem.supervisor.service.EstadoDiaBoCitaService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.time.LocalDate;

@RestController
@RequestMapping("/supervisor/spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO")
public class EstadoDiaBoCitaController {
    private final EstadoDiaBoCitaService service;

    public EstadoDiaBoCitaController(EstadoDiaBoCitaService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> obtenerUltimoEstadoDia(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "fecha", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(value = "tecnico", required = false) String tecnico) {
        return ResponseEntity.ok(ApiResponse.of(
                service.consultarUltimoEstadoDia(fecha, tecnico, token),
                "Consulta ejecutada en BDControlOrdenes."
        ));
    }
}
