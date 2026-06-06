package com.example.TigoStarSystem.nps.controller;

import com.example.TigoStarSystem.common.ApiResponse;
import com.example.TigoStarSystem.nps.service.NpsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/nps")
public class NpsController {
    private final NpsService service;

    public NpsController(NpsService service) {
        this.service = service;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> obtenerDashboard(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "modo", required = false) String modo,
            @RequestParam(value = "fechaInicio", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam(value = "fechaFin", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin,
            @RequestParam(value = "idSucursal", required = false) Integer idSucursal,
            @RequestParam(value = "idSupervisor", required = false) Integer idSupervisor,
            @RequestParam(value = "idTecnico", required = false) Integer idTecnico,
            @RequestParam(value = "supervisorNombre", required = false) String supervisorNombre,
            @RequestParam(value = "tecnicoNombre", required = false) String tecnicoNombre
    ) {
        return ResponseEntity.ok(ApiResponse.of(
                service.obtenerDashboard(token, modo, fechaInicio, fechaFin, idSucursal, idSupervisor, idTecnico, supervisorNombre, tecnicoNombre),
                "Dashboard NPS"
        ));
    }

    @GetMapping("/filtros")
    public ResponseEntity<ApiResponse<Map<String, Object>>> obtenerFiltros(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "modo", required = false) String modo,
            @RequestParam(value = "idSucursal", required = false) Integer idSucursal,
            @RequestParam(value = "idSupervisor", required = false) Integer idSupervisor,
            @RequestParam(value = "idTecnico", required = false) Integer idTecnico,
            @RequestParam(value = "supervisorNombre", required = false) String supervisorNombre,
            @RequestParam(value = "tecnicoNombre", required = false) String tecnicoNombre
    ) {
        return ResponseEntity.ok(ApiResponse.of(
                service.obtenerFiltros(token, modo, idSucursal, idSupervisor, idTecnico, supervisorNombre, tecnicoNombre),
                "Filtros NPS"
        ));
    }
}
