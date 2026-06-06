package com.example.TigoStarSystem.supervisor.controller;

import com.example.TigoStarSystem.common.ApiResponse;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaCreateRequest;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaCreateResponse;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaRelacionRequest;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaRowRequest;
import com.example.TigoStarSystem.supervisor.service.ConformacionCuadrillaService;
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
@RequestMapping({"/supervisor/conformacion-cuadrilla", "/supervisor/conformacion-cuadrillas"})
public class ConformacionCuadrillaController {
    private final ConformacionCuadrillaService service;

    public ConformacionCuadrillaController(ConformacionCuadrillaService service) {
        this.service = service;
    }

    @GetMapping({"", "/", "/listado", "/listar"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listar(
            @RequestParam(value = "fecha", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(value = "sucursal", required = false) String sucursal,
            @RequestParam(value = "limite", required = false) Integer limite,
            @RequestParam(value = "idTecnico", required = false) Integer idTecnico) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listar(fecha, sucursal, limite, idTecnico),
                "Listado de conformacion de cuadrilla."
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> obtenerDetalle(
            @PathVariable("id") Long id,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.obtenerDetalle(id, sucursal),
                "Detalle de conformacion cuadrilla."
        ));
    }

    @GetMapping({"/catalogos/tecnicos", "/catalogos/tecnico"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarTecnicos(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarTecnicos(q, limit, sucursal),
                "Listado de tecnicos."
        ));
    }

    @GetMapping({"/catalogos/filtros/tecnicos", "/catalogos/cb-tecnico"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarTecnicosFiltroEdicion(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarTecnicosFiltroEdicion(q, limit, sucursal),
                "Listado de tecnicos para filtro de edicion."
        ));
    }

    @GetMapping({"/catalogos/tecnicos/{id}", "/catalogos/tecnico/{id}"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> obtenerTecnicoDetalle(
            @PathVariable("id") Integer id) {
        return ResponseEntity.ok(ApiResponse.of(
                service.obtenerTecnicoDetalle(id),
                "Detalle de tecnico."
        ));
    }

    @GetMapping({"/catalogos/auxiliares", "/catalogos/auxiliar"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarAuxiliares(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false) Integer limit) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarAuxiliares(q, limit),
                "Listado de auxiliares."
        ));
    }

    @GetMapping({"/catalogos/actividades", "/catalogos/actividad"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarActividades() {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarActividades(),
                "Listado de actividades."
        ));
    }

    @GetMapping({"/catalogos/digitadores", "/catalogos/digitador"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarDigitadores() {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarDigitadores(),
                "Listado de digitadores."
        ));
    }

    @GetMapping({"/catalogos/filtros/digitadores", "/catalogos/cb-digitador"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarDigitadoresFiltroEdicion() {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarDigitadoresFiltroEdicion(),
                "Listado de digitadores para filtro de edicion."
        ));
    }

    @GetMapping({"/catalogos/supervisores", "/catalogos/supervisor"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarSupervisores() {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarSupervisores(),
                "Listado de supervisores."
        ));
    }

    @GetMapping({"/catalogos/salesforce", "/catalogos/sales-force"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarSalesforce(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarSalesforce(q, limit, sucursal),
                "Listado de salesforce."
        ));
    }

    @GetMapping({"/catalogos/vehiculos", "/catalogos/vehiculo"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarVehiculos(
            @RequestParam(value = "filtro", required = false) String filtro) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarVehiculos(filtro),
                "Listado de vehiculos."
        ));
    }

    @GetMapping({"/catalogos/filtros/vehiculos", "/catalogos/cb-vehiculo"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarVehiculosFiltroEdicion(
            @RequestParam(value = "idTecnico", required = false) Integer idTecnico) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarVehiculosFiltroEdicion(idTecnico),
                "Listado de vehiculos para filtro de edicion."
        ));
    }

    @GetMapping({"/catalogos/filtros/grupos", "/catalogos/cb-grupo"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarGruposFiltroEdicion(
            @RequestParam(value = "sucursal", required = false) String sucursal,
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false) Integer limit) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarGruposFiltroEdicion(sucursal, q, limit),
                "Listado de grupos para filtro de edicion."
        ));
    }

    @GetMapping({"/pendientes", "/cuadrillas/pendientes"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarPendientes(
            @RequestParam(value = "fecha", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(value = "sucursal", required = false) String sucursal,
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false) Integer limit) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarCuadrillasPendientes(fecha, sucursal, q, limit),
                "Listado de cuadrillas pendientes de confirmacion."
        ));
    }

    @GetMapping({"/confirmadas", "/cuadrillas/confirmadas"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarConfirmadas(
            @RequestParam(value = "fecha", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(value = "sucursal", required = false) String sucursal,
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false) Integer limit) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarCuadrillasConfirmadas(fecha, sucursal, q, limit),
                "Listado de cuadrillas confirmadas del dia."
        ));
    }

    @GetMapping({"/eliminadas", "/cuadrillas/eliminadas"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarEliminadas(
            @RequestParam(value = "fecha", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(value = "sucursal", required = false) String sucursal,
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false) Integer limit) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarCuadrillasEliminadas(fecha, sucursal, q, limit),
                "Listado de cuadrillas eliminadas del dia."
        ));
    }

    @GetMapping({"/catalogos/sucursal", "/catalogos/sucursales"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> obtenerSucursalActual() {
        return ResponseEntity.ok(ApiResponse.of(
                service.obtenerSucursalActual(),
                "Sucursal actual."
        ));
    }

    @PostMapping({"", "/", "/guardar"})
    public ResponseEntity<ApiResponse<ConformacionCuadrillaCreateResponse>> guardar(
            @Valid @RequestBody ConformacionCuadrillaCreateRequest request) {
        int filas = service.guardar(request);
        return ResponseEntity.ok(ApiResponse.of(
                new ConformacionCuadrillaCreateResponse(filas),
                "Cuadrilla confirmada guardada."
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Integer>> actualizar(
            @PathVariable("id") Long id,
            @Valid @RequestBody ConformacionCuadrillaRowRequest request) {
        int filas = service.actualizar(id, request);
        return ResponseEntity.ok(ApiResponse.of(
                filas,
                "Conformacion de cuadrilla actualizada."
        ));
    }

    @PostMapping({"/relaciones-cuadrilla", "/cuadrillas/relaciones"})
    public ResponseEntity<ApiResponse<Integer>> guardarRelacionCuadrilla(
            @RequestBody ConformacionCuadrillaRelacionRequest request) {
        int filas = service.guardarRelacionCuadrilla(request);
        return ResponseEntity.ok(ApiResponse.of(
                filas,
                "Relacion de cuadrilla guardada."
        ));
    }
}
