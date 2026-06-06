package com.example.TigoStarSystem.centralgrupos.controller;

import com.example.TigoStarSystem.centralgrupos.dto.CentralGrupoAsignarSupervisorRequest;
import com.example.TigoStarSystem.centralgrupos.dto.CentralGrupoAsignarTecnicoRequest;
import com.example.TigoStarSystem.centralgrupos.dto.CentralGrupoBackupRestaurarRequest;
import com.example.TigoStarSystem.centralgrupos.dto.CentralGrupoBackupTecnicoRequest;
import com.example.TigoStarSystem.centralgrupos.dto.CentralGrupoCambiarSupervisorMasivoRequest;
import com.example.TigoStarSystem.centralgrupos.dto.CentralGrupoCrearRequest;
import com.example.TigoStarSystem.centralgrupos.dto.CentralGrupoEliminarRequest;
import com.example.TigoStarSystem.centralgrupos.service.CentralGruposService;
import com.example.TigoStarSystem.common.ApiResponse;
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
@RequestMapping("/central/grupos")
public class CentralGruposController {
    private final CentralGruposService service;

    public CentralGruposController(CentralGruposService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarGrupos(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarGrupos(token, sucursal),
                "Listado de grupos."
        ));
    }

    @GetMapping("/filtros/supervisores")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarSupervisoresFiltro(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarSupervisoresFiltro(token, sucursal),
                "Listado de supervisores."
        ));
    }

    @GetMapping("/filtros/tecnicos")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarTecnicosFiltro(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "sucursal", required = false) String sucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                service.listarTecnicosFiltro(token, sucursal),
                "Listado de tecnicos."
        ));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> crearGrupo(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestBody CentralGrupoCrearRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                service.crearGrupo(token, request == null ? null : request.getSucursal(), request == null ? null : request.getNombre()),
                "Grupo creado."
        ));
    }

    @PostMapping("/asignar-supervisor")
    public ResponseEntity<ApiResponse<Map<String, Object>>> asignarSupervisor(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestBody CentralGrupoAsignarSupervisorRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                service.asignarSupervisor(
                        token,
                        request == null ? null : request.getSucursal(),
                        request == null ? null : request.getIdGrupo(),
                        request == null ? null : request.getIdUsuarioSupervisor()
                ),
                "Supervisor asignado al grupo."
        ));
    }

    @PostMapping("/asignar-tecnico")
    public ResponseEntity<ApiResponse<Map<String, Object>>> asignarTecnico(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestBody CentralGrupoAsignarTecnicoRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                service.asignarTecnico(
                        token,
                        request == null ? null : request.getSucursal(),
                        request == null ? null : request.getIdGrupo(),
                        request == null ? null : request.getIdUsuarioTecnico()
                ),
                "Tecnico asignado al grupo."
        ));
    }

    @PostMapping("/quitar-tecnico")
    public ResponseEntity<ApiResponse<Map<String, Object>>> quitarTecnico(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestBody CentralGrupoAsignarTecnicoRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                service.quitarTecnico(
                        token,
                        request == null ? null : request.getSucursal(),
                        request == null ? null : request.getIdGrupo(),
                        request == null ? null : request.getIdUsuarioTecnico()
                ),
                "Tecnico quitado del grupo."
        ));
    }

    @PostMapping("/eliminar")
    public ResponseEntity<ApiResponse<Map<String, Object>>> eliminarGrupo(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestBody CentralGrupoEliminarRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                service.eliminarGrupo(
                        token,
                        request == null ? null : request.getSucursal(),
                        request == null ? null : request.getIdGrupo()
                ),
                "Grupo eliminado."
        ));
    }

    @PostMapping("/supervisor-ausente")
    public ResponseEntity<ApiResponse<Map<String, Object>>> marcarSupervisorAusente(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestBody CentralGrupoBackupTecnicoRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                service.marcarSupervisorAusente(
                        token,
                        request == null ? null : request.getSucursal(),
                        request == null ? null : request.getIdGrupo(),
                        request == null ? null : request.getIdUsuarioTecnico()
                ),
                "Supervisor marcado como ausente."
        ));
    }

    @PostMapping("/restaurar-supervisor")
    public ResponseEntity<ApiResponse<Map<String, Object>>> restaurarSupervisor(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestBody CentralGrupoBackupRestaurarRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                service.restaurarSupervisor(
                        token,
                        request == null ? null : request.getSucursal(),
                        request == null ? null : request.getIdGrupo()
                ),
                "Supervisor restaurado."
        ));
    }

    @PostMapping("/cambiar-colaborador-backup")
    public ResponseEntity<ApiResponse<Map<String, Object>>> cambiarColaboradorBackup(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestBody CentralGrupoBackupTecnicoRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                service.cambiarColaboradorBackup(
                        token,
                        request == null ? null : request.getSucursal(),
                        request == null ? null : request.getIdGrupo(),
                        request == null ? null : request.getIdUsuarioTecnico()
                ),
                "Colaborador temporal actualizado."
        ));
    }

    @PostMapping("/cambiar-supervisor-masivo")
    public ResponseEntity<ApiResponse<Map<String, Object>>> cambiarSupervisorMasivo(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestBody CentralGrupoCambiarSupervisorMasivoRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                service.cambiarSupervisorMasivo(
                        token,
                        request == null ? null : request.getSucursal(),
                        request == null ? null : request.getIdSupervisorOrigen(),
                        request == null ? null : request.getIdSupervisorDestino(),
                        request == null ? null : request.getIdGrupos()
                ),
                "Supervisor reasignado en grupos."
        ));
    }
}
