package com.example.TigoStarSystem.supervision.controller;

import com.example.TigoStarSystem.common.ApiResponse;
import com.example.TigoStarSystem.supervision.dto.SupervisionCrearRequest;
import com.example.TigoStarSystem.supervision.service.SupervisionService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
@RequestMapping("/supervisor/supervision")
public class SupervisionController {
    private final SupervisionService service;

    public SupervisionController(SupervisionService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listar(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "fechaDesde", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(value = "fechaHasta", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta,
            @RequestParam(value = "limite", required = false) Integer limite) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listar(fechaDesde, fechaHasta, limite, token),
                "Listado de notas de supervision."
        ));
    }

    @GetMapping("/agenda")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarAgenda(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "fechaDesde", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(value = "fechaHasta", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta,
            @RequestParam(value = "limite", required = false) Integer limite) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarPendientes(fechaDesde, fechaHasta, limite, token),
                "Listado de supervisiones pendientes (agenda)."
        ));
    }

    @GetMapping("/{idSupervision}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> obtenerDetalle(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @PathVariable("idSupervision") String idSupervision) {
        return ResponseEntity.ok(ApiResponse.of(
                service.obtenerDetalle(idSupervision, token),
                "Detalle de supervision."
        ));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> registrar(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @Valid @RequestBody SupervisionCrearRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                service.registrar(request, token),
                "Nota de supervision registrada."
        ));
    }

    @GetMapping("/catalogos/tipos-supervision")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarTiposSupervision(
            @RequestHeader(value = "X-Session-Token", required = false) String token) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarTiposSupervision(token),
                "Listado de tipos de supervision."
        ));
    }

    @GetMapping("/catalogos/tipos-trabajo")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarTiposTrabajo(
            @RequestHeader(value = "X-Session-Token", required = false) String token) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarTiposTrabajo(token),
                "Listado de tipos de trabajo."
        ));
    }

    @GetMapping("/catalogos/tipos-penalizacion")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarTiposPenalizacion(
            @RequestHeader(value = "X-Session-Token", required = false) String token) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarTiposPenalizacion(token),
                "Listado de tipos de penalizacion."
        ));
    }

    @GetMapping("/catalogos/tecnicos")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarTecnicosSupervisor(
            @RequestHeader(value = "X-Session-Token", required = false) String token) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarTecnicosSupervisor(token),
                "Listado de tecnicos asociados al supervisor."
        ));
    }

    @GetMapping("/jornadas/pendientes")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarJornadasPendientes(
            @RequestHeader(value = "X-Session-Token", required = false) String token) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarIniciosPendientes(token),
                "Listado de inicios de jornada pendientes de aprobacion."
        ));
    }

    @GetMapping("/jornadas/confirmadas-hoy")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarJornadasConfirmadasHoy(
            @RequestHeader(value = "X-Session-Token", required = false) String token) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarIniciosConfirmadosHoy(token),
                "Listado de inicios de jornada confirmados hoy."
        ));
    }

    @PostMapping("/jornadas/{idInicio}/aprobar")
    public ResponseEntity<ApiResponse<Map<String, Object>>> aprobarJornada(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @PathVariable("idInicio") Integer idInicio) {
        return ResponseEntity.ok(ApiResponse.of(
                service.aprobarInicioPendiente(idInicio, token),
                "Inicio de jornada aprobado."
        ));
    }

    @PostMapping("/jornadas/{idInicio}/rechazar")
    public ResponseEntity<ApiResponse<Map<String, Object>>> rechazarJornada(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @PathVariable("idInicio") Integer idInicio) {
        return ResponseEntity.ok(ApiResponse.of(
                service.rechazarInicioPendiente(idInicio, token),
                "Inicio de jornada rechazado."
        ));
    }
}
