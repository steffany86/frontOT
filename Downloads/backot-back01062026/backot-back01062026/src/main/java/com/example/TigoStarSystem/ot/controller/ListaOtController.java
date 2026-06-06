package com.example.TigoStarSystem.ot.controller;

import com.example.TigoStarSystem.auth.dto.AuthMeResponse;
import com.example.TigoStarSystem.auth.service.AuthService;
import com.example.TigoStarSystem.common.ApiException;
import com.example.TigoStarSystem.common.ApiResponse;
import com.example.TigoStarSystem.ot.service.ListaOtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.LinkedHashMap;
import java.util.Map;

@Validated
@RestController
@RequestMapping({
        "/ListaOt",
        "/supervisor/spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO",
        "/ot/spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO",
        "/spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO"
})
public class ListaOtController {
    private static final Logger logger = LoggerFactory.getLogger(ListaOtController.class);
    private final ListaOtService listaOtService;
    private final AuthService authService;

    public ListaOtController(ListaOtService listaOtService, AuthService authService) {
        this.listaOtService = listaOtService;
        this.authService = authService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listar(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "fecha", required = false) String fecha,
            @RequestParam(value = "rol", required = false) String rol,
            @RequestParam(value = "idUsuario", required = false) Integer idUsuario,
            @RequestParam(value = "tecnico", required = false) String tecnico,
            @RequestParam(value = "estado", required = false) String estado,
            @RequestParam(value = "estados", required = false) List<String> estados) {
        AuthMeResponse me = resolveSession(token);
        LocalDate fechaFiltro = resolveFecha(fecha);
        String rolResuelto = resolveRol(me, rol);
        boolean administrador = isAdministrador(me, rolResuelto);
        boolean tecnicoRol = isTecnico(rolResuelto);
        Integer idUsuarioSesion = extractIdUsuario(me);
        Integer idUsuarioFiltro = idUsuarioSesion != null ? idUsuarioSesion : idUsuario;

        String tecnicoFiltro = tecnico;
        boolean tecnicoExacto = false;

        if (tecnicoRol && !administrador) {
            tecnicoFiltro = resolveTecnicoPropio(me);
            tecnicoExacto = true;
            idUsuarioFiltro = idUsuarioSesion != null ? idUsuarioSesion : idUsuario;
        }

        Map<String, Object> flujo = new LinkedHashMap<>();
        flujo.put("evento", "LISTA_OT_FLUJO");
        flujo.put("fecha", String.valueOf(fechaFiltro));
        flujo.put("rolResuelto", rolResuelto);
        flujo.put("tecnicoRol", tecnicoRol);
        flujo.put("idUsuarioSesion", idUsuarioSesion);
        flujo.put("idUsuarioFiltro", idUsuarioFiltro);
        flujo.put("idSucursalSesion", extractIdSucursal(me));
        flujo.put("nombreSesion", me != null && me.getUsuario() != null ? me.getUsuario().getNombre() : null);
        flujo.put("tecnicoRecibidoQuery", tecnico);
        flujo.put("tecnicoUsadoFinal", tecnicoFiltro);
        flujo.put("estados", resolveEstados(estado, estados));
        logger.info("{}", flujo);

        List<String> estadosFiltro = resolveEstados(estado, estados);
        List<Map<String, Object>> data = listaOtService.listar(
                fechaFiltro,
                tecnicoFiltro,
                tecnicoExacto,
                estadosFiltro,
                idUsuarioFiltro,
                extractIdSucursal(me)
        );
        return ResponseEntity.ok(ApiResponse.of(data, "Listado de OT (SP BO CITA MAKIRO)."));
    }

    private AuthMeResponse resolveSession(String token) {
        if (isBlank(token)) {
            return null;
        }
        return authService.me(token);
    }

    private Integer extractIdSucursal(AuthMeResponse me) {
        if (me == null || me.getUsuario() == null) {
            return null;
        }
        return me.getUsuario().getIdSucursal();
    }

    private Integer extractIdUsuario(AuthMeResponse me) {
        if (me == null || me.getUsuario() == null) {
            return null;
        }
        return me.getUsuario().getIdUsuario();
    }

    private String resolveRol(AuthMeResponse me, String rolParam) {
        if (me != null && me.getUsuario() != null && !isBlank(me.getUsuario().getRol())) {
            return me.getUsuario().getRol();
        }
        if (!isBlank(rolParam)) {
            return rolParam;
        }
        // Compatibilidad legacy: evitar 400 cuando no llega rol ni sesion.
        return "tecnico";
    }

    private LocalDate resolveFecha(String fechaParam) {
        if (isBlank(fechaParam)) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(fechaParam.trim());
        } catch (DateTimeParseException ex) {
            return LocalDate.now();
        }
    }

    private boolean isAdministrador(AuthMeResponse me, String rolResuelto) {
        if (me != null && me.getUsuario() != null && authService.esAdministrador(me.getUsuario())) {
            return true;
        }
        String normalized = normalizeText(rolResuelto);
        return "sistemas".equals(normalized)
                || "admin".equals(normalized)
                || "administrador".equals(normalized);
    }

    private boolean isTecnico(String rol) {
        String normalized = normalizeText(rol);
        return normalized != null
                && (normalized.contains("tecnico") || "tec".equals(normalized) || normalized.contains("tech"));
    }

    private String resolveTecnicoPropio(AuthMeResponse me) {
        if (me != null && me.getUsuario() != null && !isBlank(me.getUsuario().getNombre())) {
            return me.getUsuario().getNombre();
        }
        throw new ApiException(
                HttpStatus.UNAUTHORIZED,
                "SESSION_REQUIRED",
                "Para rol tecnico se requiere token de sesion valido."
        );
    }

    private List<String> resolveEstados(String estado, List<String> estados) {
        List<String> out = new ArrayList<>();
        if (!isBlank(estado)) {
            String[] parts = estado.split(",");
            for (String item : parts) {
                if (!isBlank(item)) {
                    out.add(item.trim());
                }
            }
        }
        if (estados != null && !estados.isEmpty()) {
            for (String item : estados) {
                if (!isBlank(item)) {
                    out.add(item.trim());
                }
            }
        }
        return out;
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return normalized.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
