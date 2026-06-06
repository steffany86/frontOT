package com.example.TigoStarSystem.supervision.service;

import com.example.TigoStarSystem.auth.dto.AuthMeResponse;
import com.example.TigoStarSystem.auth.dto.SucursalResponse;
import com.example.TigoStarSystem.auth.service.AuthService;
import com.example.TigoStarSystem.common.ApiException;
import com.example.TigoStarSystem.supervision.dto.SupervisionCrearRequest;
import com.example.TigoStarSystem.supervision.dto.SupervisionCrearPendienteRequest;
import com.example.TigoStarSystem.supervisor.SucursalCanonicalizer;
import com.example.TigoStarSystem.supervision.repository.SupervisionRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SupervisionService {
    private final SupervisionRepository repository;
    private final AuthService authService;

    public SupervisionService(
            SupervisionRepository repository,
            AuthService authService) {
        this.repository = repository;
        this.authService = authService;
    }

    public List<Map<String, Object>> listar(
            LocalDate fechaDesde,
            LocalDate fechaHasta,
            Integer limite,
            String token) {
        validarRangoFechas(fechaDesde, fechaHasta);
        AuthMeResponse me = authService.me(token);
        Integer idSupervisor = resolveIdUsuario(me);
        return repository.listar(String.valueOf(idSupervisor), fechaDesde, fechaHasta, limite);
    }

    public List<Map<String, Object>> listarPendientes(
            LocalDate fechaDesde,
            LocalDate fechaHasta,
            Integer limite,
            String token) {
        validarRangoFechas(fechaDesde, fechaHasta);
        AuthMeResponse me = authService.me(token);
        Integer idSupervisor = resolveIdUsuario(me);
        return repository.listarPendientes(String.valueOf(idSupervisor), fechaDesde, fechaHasta, limite);
    }

    public Map<String, Object> obtenerDetalle(String idSupervision, String token) {
        AuthMeResponse me = authService.me(token);
        Integer idSupervisor = resolveIdUsuario(me);
        String sucursal = resolveSucursalNombre(me);
        Map<String, Object> detalle = repository.obtenerDetalle(idSupervision, String.valueOf(idSupervisor));
        if (detalle == null) {
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    "NOT_FOUND",
                    "No se encontro la nota de supervision indicada."
            );
        }
        return repository.enriquecerDetalleConNombres(detalle, sucursal);
    }

    public Map<String, Object> registrar(SupervisionCrearRequest request, String token) {
        AuthMeResponse me = authService.me(token);
        Integer idSupervisor = resolveIdUsuario(me);

        if (request == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "Request de supervision es requerido."
            );
        }

        String idGenerado = repository.registrar(
                idSupervisor,
                request.getIdTecnicoPrincipal(),
                request.getIdTecnicoAuxiliar(),
                request.getIdTipoSupervision(),
                request.getIdTipoTrabajo(),
                request.getIdTipoPenalizacion(),
                request.getSupervisionPor(),
                request.getTecnologia(),
                request.getCodigo(),
                request.getOrdenTrabajo(),
                request.getTipoRevision(),
                request.getFotoBoletaSupervision(),
                request.getFotoCanalesPilos(),
                request.getFotoNivelesDocsis(),
                request.getFotoMedicionRuido(),
                request.getFotoBarridoCanales(),
                request.getFotoObservacion1(),
                request.getFotoObservacion2(),
                request.getFotoObservacion3(),
                request.getFotoObservacion4(),
                request.getObservacion(),
                request.getDescripcionAdicionalObservacion(),
                request.getUbicacion()
        );

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("idSupervision", idGenerado);
        out.put("idUsuarioSesion", idSupervisor);
        return out;
    }

    public List<Map<String, Object>> listarTiposSupervision(String token) {
        authService.me(token);
        try {
            return repository.listarTiposSupervision();
        } catch (DataAccessException ex) {
            return java.util.Collections.emptyList();
        }
    }

    public List<Map<String, Object>> listarTiposTrabajo(String token) {
        authService.me(token);
        try {
            return repository.listarTiposTrabajo();
        } catch (DataAccessException ex) {
            return java.util.Collections.emptyList();
        }
    }

    public List<Map<String, Object>> listarTiposPenalizacion(String token) {
        authService.me(token);
        try {
            return repository.listarTiposPenalizacion();
        } catch (DataAccessException ex) {
            return java.util.Collections.emptyList();
        }
    }

    public List<Map<String, Object>> listarTecnicosSupervisor(String token) {
        AuthMeResponse me = authService.me(token);
        Integer idSupervisor = resolveIdUsuario(me);
        String sucursal = resolveSucursalNombre(me);
        try {
            return repository.listarTecnicosPorSupervisor(idSupervisor, sucursal);
        } catch (DataAccessException ex) {
            return java.util.Collections.emptyList();
        }
    }

    public List<Map<String, Object>> listarIniciosPendientes(String token) {
        AuthMeResponse me = authService.me(token);
        Integer idSupervisor = resolveIdUsuario(me);
        String sucursal = resolveSucursalNombre(me);
        try {
            return repository.listarIniciosJornadaPendientesSupervisor(idSupervisor, sucursal);
        } catch (DataAccessException ex) {
            return new ArrayList<>();
        }
    }

    public List<Map<String, Object>> listarIniciosConfirmadosHoy(String token) {
        AuthMeResponse me = authService.me(token);
        Integer idSupervisor = resolveIdUsuario(me);
        String sucursal = resolveSucursalNombre(me);
        try {
            return repository.listarIniciosJornadaConfirmadosHoySupervisor(idSupervisor, sucursal);
        } catch (DataAccessException ex) {
            return new ArrayList<>();
        }
    }

    public Map<String, Object> aprobarInicioPendiente(Integer idInicio, String token) {
        AuthMeResponse me = authService.me(token);
        Integer idSupervisor = resolveIdUsuario(me);
        int updated = repository.aprobarInicioJornada(idSupervisor, idInicio);
        if (updated <= 0) {
            updated = repository.aprobarInicioJornadaPorId(idInicio);
        }
        if (updated <= 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No se encontro inicio pendiente para aprobar.");
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("idInicio", idInicio);
        out.put("aprobado", true);
        return out;
    }

    public Map<String, Object> rechazarInicioPendiente(Integer idInicio, String token) {
        AuthMeResponse me = authService.me(token);
        Integer idSupervisor = resolveIdUsuario(me);
        int updated = repository.rechazarInicioJornada(idSupervisor, idInicio);
        if (updated <= 0) {
            updated = repository.rechazarInicioJornadaPorId(idInicio);
        }
        if (updated <= 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No se encontro inicio pendiente para rechazar.");
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("idInicio", idInicio);
        out.put("rechazado", true);
        return out;
    }

    private Integer resolveIdUsuario(AuthMeResponse me) {
        Integer idUsuario = me != null && me.getUsuario() != null ? me.getUsuario().getIdUsuario() : null;
        if (idUsuario == null) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "SESSION_INVALID",
                    "No se pudo identificar el usuario de la sesion."
            );
        }
        return idUsuario;
    }

    private void validarRangoFechas(LocalDate fechaDesde, LocalDate fechaHasta) {
        if (fechaDesde != null && fechaHasta != null && fechaDesde.isAfter(fechaHasta)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "fechaDesde no puede ser mayor a fechaHasta."
            );
        }
    }

    private String resolveSucursalNombre(AuthMeResponse me) {
        Integer idSucursal = me != null && me.getUsuario() != null ? me.getUsuario().getIdSucursal() : null;
        if (idSucursal == null) return null;
        List<SucursalResponse> sucursales = authService.listarSucursales();
        for (SucursalResponse item : sucursales) {
            if (item != null && idSucursal.equals(item.getIdSucursal())) {
                return SucursalCanonicalizer.canonicalize(item.getSucursal());
            }
        }
        return null;
    }

    public Map<String, Object> registrarPendiente(SupervisionCrearPendienteRequest request, String token) {
        authService.me(token);

        if (request == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "Request de supervision es requerido."
            );
        }

        String idGenerado = repository.registrarPendiente(
                request.getIdSupervisorAsignado(),
                request.getIdTecnicoPrincipal(),
                request.getIdTecnicoAuxiliar(),
                request.getIdTipoSupervision(),
                request.getIdTipoTrabajo(),
                request.getIdTipoPenalizacion(),
                request.getSupervisionPor(),
                request.getTecnologia(),
                request.getCodigo(),
                request.getOrdenTrabajo(),
                request.getTipoRevision(),
                request.getFotoBoletaSupervision(),
                request.getFotoCanalesPilos(),
                request.getFotoNivelesDocsis(),
                request.getFotoMedicionRuido(),
                request.getFotoBarridoCanales(),
                request.getFotoObservacion1(),
                request.getFotoObservacion2(),
                request.getFotoObservacion3(),
                request.getFotoObservacion4(),
                request.getObservacion(),
                request.getDescripcionAdicionalObservacion(),
                request.getUbicacion()
        );

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("idSupervision", idGenerado);
        out.put("idSupervisorAsignado", request.getIdSupervisorAsignado());
        return out;
    }

    public List<Map<String, Object>> listarSupervisores(String sucursal, String token) {
        AuthMeResponse me = authService.me(token);
        String sucursalResuelta = SucursalCanonicalizer.canonicalize(
                isBlank(sucursal) ? resolveSucursalNombre(me) : sucursal
        );
        try {
            return repository.listarSupervisores(sucursalResuelta);
        } catch (DataAccessException ex) {
            return java.util.Collections.emptyList();
        }
    }

    public List<Map<String, Object>> listarTecnicosPorSupervisorBackoffice(Integer idSupervisor, String sucursal) {
        return listarTecnicosPorSupervisorBackoffice(idSupervisor, sucursal, null);
    }

    public List<Map<String, Object>> listarTecnicosPorSupervisorBackoffice(Integer idSupervisor, String sucursal, String supervisor) {
        try {
            String sucursalResuelta = SucursalCanonicalizer.canonicalize(sucursal);
            return repository.listarTecnicosPorSupervisorBackoffice(idSupervisor, sucursalResuelta, supervisor);
        } catch (DataAccessException ex) {
            return java.util.Collections.emptyList();
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

}
