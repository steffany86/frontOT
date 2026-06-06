package com.example.TigoStarSystem.supervisor.controller;

import com.example.TigoStarSystem.common.ApiResponse;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaWebRequest;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaWebResponse;
import com.example.TigoStarSystem.supervisor.service.ConformacionCuadrillaWebService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Validated
@RestController
@RequestMapping("/supervisor/conformacion-cuadrilla-web")
public class ConformacionCuadrillaWebController {
    private final ConformacionCuadrillaWebService service;

    public ConformacionCuadrillaWebController(ConformacionCuadrillaWebService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ConformacionCuadrillaWebResponse>>> listar(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "fecha", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(value = "sucursal", required = false) String sucursal,
            @RequestParam(value = "limite", required = false) Integer limite) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listar(fecha, sucursal, limite, token),
                "Listado de conformacion cuadrilla web."
        ));
    }

    @GetMapping({"/catalogos/tecnicos", "/catalogos/tecnico"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarTecnicos(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarTecnicos(q, limit, sucursal, token),
                "Listado de tecnicos para conformacion cuadrilla web."
        ));
    }

    @GetMapping({"/catalogos/tecnicos/{id}", "/catalogos/tecnico/{id}"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> obtenerTecnicoDetalle(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @PathVariable("id") Integer id,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.obtenerTecnicoDetalle(id, sucursal, token),
                "Detalle de tecnico para conformacion cuadrilla web."
        ));
    }

    @GetMapping({"/catalogos/auxiliares", "/catalogos/auxiliar"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarAuxiliares(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarAuxiliares(sucursal, token),
                "Listado de auxiliares para conformacion cuadrilla web."
        ));
    }

    @GetMapping({"/catalogos/digitadores", "/catalogos/digitador"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarDigitadores(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarDigitadores(sucursal, token),
                "Listado de digitadores para conformacion cuadrilla web."
        ));
    }

    @GetMapping({"/catalogos/supervisores", "/catalogos/supervisor"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarSupervisores(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarSupervisores(sucursal, token),
                "Listado de supervisores para conformacion cuadrilla web."
        ));
    }

    @GetMapping({"/catalogos/salesforce", "/catalogos/sales-force"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarSalesforce(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarSalesforce(q, limit, sucursal, token),
                "Listado de salesforce para conformacion cuadrilla web."
        ));
    }

    @GetMapping({"/catalogos/actividades", "/catalogos/actividad"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarActividades(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarActividades(sucursal, token),
                "Listado de actividades para conformacion cuadrilla web."
        ));
    }

    @GetMapping({"/catalogos/vehiculos", "/catalogos/vehiculo"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarVehiculos(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "filtro", required = false) String filtro,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarVehiculos(filtro, sucursal, token),
                "Listado de vehiculos para conformacion cuadrilla web."
        ));
    }

    @GetMapping({"/catalogos/sucursales", "/catalogos/sucursal"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarSucursales(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarSucursales(sucursal, token),
                "Listado de sucursales para conformacion cuadrilla web."
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ConformacionCuadrillaWebResponse>> obtenerPorId(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @PathVariable("id") Long id,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.obtenerPorId(id, sucursal, token),
                "Detalle de conformacion cuadrilla web."
        ));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ConformacionCuadrillaWebResponse>> crear(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @Valid @RequestBody ConformacionCuadrillaWebRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                service.crear(request, token),
                "Conformacion cuadrilla web registrada."
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ConformacionCuadrillaWebResponse>> actualizar(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @PathVariable("id") Long id,
            @Valid @RequestBody ConformacionCuadrillaWebRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                service.actualizar(id, request, token),
                "Conformacion cuadrilla web actualizada."
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Integer>> eliminar(@PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.of(
                service.eliminar(id),
                "Conformacion cuadrilla web eliminada."
        ));
    }
}
