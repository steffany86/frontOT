package com.example.TigoStarSystem.nps.service;

import com.example.TigoStarSystem.auth.dto.AuthLoginResponse;
import com.example.TigoStarSystem.auth.dto.AuthMeResponse;
import com.example.TigoStarSystem.auth.dto.SucursalResponse;
import com.example.TigoStarSystem.auth.service.AuthService;
import com.example.TigoStarSystem.common.ApiException;
import com.example.TigoStarSystem.config.DbConnectionManager;
import com.example.TigoStarSystem.nps.repository.NpsRepository;
import com.example.TigoStarSystem.supervision.repository.SupervisionRepository;
import com.example.TigoStarSystem.supervisor.SucursalCanonicalizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class NpsService {
    private final NpsRepository repository;
    private final SupervisionRepository supervisionRepository;
    private final AuthService authService;
    private final DbConnectionManager dbConnectionManager;
    private final String defaultDbUsername;
    private final String defaultDbPassword;

    public NpsService(
            NpsRepository repository,
            SupervisionRepository supervisionRepository,
            AuthService authService,
            DbConnectionManager dbConnectionManager,
            @Value("${spring.datasource.username}") String defaultDbUsername,
            @Value("${spring.datasource.password}") String defaultDbPassword) {
        this.repository = repository;
        this.supervisionRepository = supervisionRepository;
        this.authService = authService;
        this.dbConnectionManager = dbConnectionManager;
        this.defaultDbUsername = defaultDbUsername;
        this.defaultDbPassword = defaultDbPassword;
    }

    public Map<String, Object> obtenerDashboard(
            String token,
            String modo,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            Integer idSucursal,
            Integer idSupervisor,
            Integer idTecnico,
            String supervisorNombre,
            String tecnicoNombre) {
        Map<String, Object> scope = resolveScope(token, idSucursal, idSupervisor, idTecnico, supervisorNombre, tecnicoNombre);
        Integer idUsuarioSesion = (Integer) scope.get("idUsuarioSesion");
        Integer sucursalObjetivo = (Integer) scope.get("idSucursal");
        Integer supervisorObjetivo = (Integer) scope.get("idSupervisor");
        Integer tecnicoObjetivo = (Integer) scope.get("idTecnico");
        String supervisorNombreObjetivo = (String) scope.get("supervisorNombre");
        String tecnicoNombreObjetivo = (String) scope.get("tecnicoNombre");
        String rolConsulta = (String) scope.get("scope");
        JdbcTemplate centralTemplate = dbConnectionManager.connDb("central");
        JdbcTemplate sucursalTemplate = resolveSucursalTemplate(sucursalObjetivo);
        boolean modoInvitado = isModoInvitado(modo);
        Integer supervisorParaConsulta = supervisorObjetivo;

        // Para supervisor: si el usuario elige tecnico explicito,
        // no bloquear por idSupervisor historico del registro (aplica en ambos modos NPS).
        if ("SUPERVISOR".equalsIgnoreCase(rolConsulta)
                && (tecnicoObjetivo != null || !isBlank(tecnicoNombreObjetivo))) {
            supervisorParaConsulta = null;
        }

        LocalDate fechaInicioConsulta = fechaInicio;
        LocalDate fechaFinConsulta = fechaFin;
        if (modoInvitado) {
            fechaFinConsulta = LocalDate.now();
            fechaInicioConsulta = fechaFinConsulta.minusDays(3);
        }

        // En NPS Invitado para rol TECNICO: forzar filtro por el tecnico logueado.
        // Esto evita que vea datos de otros tecnicos de su supervisor.
        if (modoInvitado && "TECNICO".equalsIgnoreCase(rolConsulta)) {
            String tecnicoSesion = resolveNombreTecnicoSesion(
                    sucursalTemplate,
                    sucursalObjetivo,
                    supervisorObjetivo,
                    tecnicoObjetivo,
                    idUsuarioSesion
            );
            if (!isBlank(tecnicoSesion)) {
                tecnicoNombreObjetivo = tecnicoSesion;
            }
            // Evitar que un idTecnico de mapeo distinto deje sin resultados.
            tecnicoObjetivo = null;
        }
        // En NPS Respuestas para tecnico: usar nombre del tecnico logueado como fallback
        // cuando el idTecnico de mapeo no coincide con los datos NPS historicos.
        if (!modoInvitado && "TECNICO".equalsIgnoreCase(rolConsulta) && isBlank(tecnicoNombreObjetivo)) {
            String tecnicoSesion = resolveNombreTecnicoSesion(
                    sucursalTemplate,
                    sucursalObjetivo,
                    supervisorObjetivo,
                    tecnicoObjetivo,
                    idUsuarioSesion
            );
            if (!isBlank(tecnicoSesion)) {
                tecnicoNombreObjetivo = tecnicoSesion;
            }
        }
        if (!modoInvitado && "TECNICO".equalsIgnoreCase(rolConsulta) && !isBlank(tecnicoNombreObjetivo)) {
            // En respuestas priorizar nombre del tecnico para no depender de id_vendedor legacy.
            tecnicoObjetivo = null;
        }

        List<Map<String, Object>> data = modoInvitado
                ? repository.obtenerDashboardInvitado(
                    centralTemplate,
                    fechaInicioConsulta,
                    fechaFinConsulta,
                    sucursalObjetivo,
                    supervisorParaConsulta,
                    tecnicoObjetivo,
                    supervisorNombreObjetivo,
                    tecnicoNombreObjetivo
                )
                : repository.obtenerDashboard(
                    centralTemplate,
                    fechaInicioConsulta,
                    fechaFinConsulta,
                    sucursalObjetivo,
                    supervisorParaConsulta,
                    tecnicoObjetivo,
                    supervisorNombreObjetivo,
                    tecnicoNombreObjetivo,
                    rolConsulta,
                    idUsuarioSesion
                );
        if (modoInvitado) {
            data = filtrarDashboardPorInterseccionTecnicos(
                    centralTemplate,
                    sucursalTemplate,
                    sucursalObjetivo,
                    supervisorObjetivo,
                    tecnicoNombreObjetivo,
                    data
            );
        }
        boolean permitirFallbackFechas =
                supervisorObjetivo == null
                && tecnicoObjetivo == null
                && isBlank(supervisorNombreObjetivo)
                && isBlank(tecnicoNombreObjetivo);
        boolean fallbackUltimaFecha = false;
        if (permitirFallbackFechas && data.isEmpty() && (fechaInicio != null || fechaFin != null)) {
            data = modoInvitado
                    ? repository.obtenerDashboardInvitado(
                        centralTemplate,
                        LocalDate.now().minusDays(3),
                        LocalDate.now(),
                        sucursalObjetivo,
                        supervisorParaConsulta,
                        tecnicoObjetivo,
                        supervisorNombreObjetivo,
                        tecnicoNombreObjetivo
                    )
                    : repository.obtenerDashboard(
                        centralTemplate,
                        null,
                        null,
                        sucursalObjetivo,
                        supervisorParaConsulta,
                        tecnicoObjetivo,
                        supervisorNombreObjetivo,
                        tecnicoNombreObjetivo,
                        rolConsulta,
                        idUsuarioSesion
                    );
            if (modoInvitado) {
                data = filtrarDashboardPorInterseccionTecnicos(
                        centralTemplate,
                        sucursalTemplate,
                        sucursalObjetivo,
                        supervisorObjetivo,
                        tecnicoNombreObjetivo,
                        data
                );
            }
            fallbackUltimaFecha = !data.isEmpty();
        }

        Map<String, Object> out = new LinkedHashMap<String, Object>();
        out.put("scope", rolConsulta);
        out.put("idSucursal", sucursalObjetivo);
        out.put("idSupervisor", supervisorObjetivo);
        out.put("idTecnico", tecnicoObjetivo);
        out.put("modo", modoInvitado ? "nps_invitado" : "nps_respuestas");
        out.put("fallbackUltimaFecha", fallbackUltimaFecha);
        out.put("rows", data);
        out.put("filtros", obtenerFiltrosInterno(scope));
        return out;
    }

    public Map<String, Object> obtenerFiltros(
            String token,
            String modo,
            Integer idSucursal,
            Integer idSupervisor,
            Integer idTecnico,
            String supervisorNombre,
            String tecnicoNombre) {
        Map<String, Object> scope = resolveScope(token, idSucursal, idSupervisor, idTecnico, supervisorNombre, tecnicoNombre);
        Map<String, Object> out = new LinkedHashMap<String, Object>();
        out.put("scope", scope.get("scope"));
        out.put("idSucursal", scope.get("idSucursal"));
        out.put("idSupervisor", scope.get("idSupervisor"));
        out.put("idTecnico", scope.get("idTecnico"));
        out.put("modo", isModoInvitado(modo) ? "nps_invitado" : "nps_respuestas");
        out.put("filtros", obtenerFiltrosInterno(scope));
        return out;
    }

    private boolean isModoInvitado(String modo) {
        if (modo == null) return false;
        String m = modo.trim().toLowerCase();
        return m.equals("nps_invitado") || m.equals("invitado") || m.equals("npsinvitado");
    }

    private Map<String, Object> resolveScope(
            String token,
            Integer idSucursal,
            Integer idSupervisor,
            Integer idTecnico,
            String supervisorNombre,
            String tecnicoNombre) {
        AuthMeResponse me = authService.me(token);
        AuthLoginResponse usuario = requireUsuario(me);

        Integer idUsuarioSesion = usuario.getIdUsuario();
        Integer idSucursalSesion = usuario.getIdSucursal();

        boolean esTecnico = isRol(usuario, "tecnico");
        boolean esSupervisor = isRol(usuario, "supervisor");
        boolean esCentral = isRolCentral(usuario);

        if (!esTecnico && !esSupervisor && !esCentral) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Rol sin acceso a NPS.");
        }

        Integer sucursalObjetivo = esCentral ? requireParam(idSucursal, "idSucursal") : idSucursalSesion;
        if (sucursalObjetivo == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "No se pudo resolver sucursal de sesion.");
        }
        JdbcTemplate centralTemplate = dbConnectionManager.connDb("central");

        Integer supervisorObjetivo = idSupervisor;
        Integer tecnicoObjetivo = idTecnico;
        String rolConsulta;

        if (esTecnico) {
            rolConsulta = "TECNICO";
            // Regla: tecnico logeado manda su propio tecnico/supervisor de sesion, no selector.
            JdbcTemplate sucursalTemplate = resolveSucursalTemplate(sucursalObjetivo);
            List<Integer> idsTecnicoNps = repository.listarIdsTecnicoNpsPorUsuario(sucursalTemplate, idUsuarioSesion);
            tecnicoObjetivo = idsTecnicoNps.isEmpty() ? idUsuarioSesion : idsTecnicoNps.get(0);
            Integer idSupervisorSesion = resolveSupervisorDelTecnico(centralTemplate, sucursalObjetivo, idUsuarioSesion);
            supervisorObjetivo = idSupervisorSesion;
            // Evitar filtro por nombre para tecnico: en algunas BD llega con codificacion distinta (ej. CARREÃƒÂ‘O),
            // y termina vaciando resultados aunque existan filas por idTecnico.
            tecnicoNombre = trimToNull(usuario.getNombre());
            supervisorNombre = null;
        } else if (esSupervisor) {
            rolConsulta = "SUPERVISOR";
            // Regla: supervisor logeado manda su propio idSupervisor de sesion, no selector.
            supervisorObjetivo = idUsuarioSesion;
            if (idTecnico != null) {
                JdbcTemplate sucursalTemplate = resolveSucursalTemplate(sucursalObjetivo);
                List<Integer> idsTecnicoNps = repository.listarIdsTecnicoNpsPorUsuario(sucursalTemplate, idTecnico);
                tecnicoObjetivo = idsTecnicoNps.isEmpty() ? idTecnico : idsTecnicoNps.get(0);
            } else {
                tecnicoObjetivo = null;
            }
            supervisorNombre = null;
        } else {
            rolConsulta = "CENTRAL";
            // Regla: central/admin toma supervisor y tecnico desde selectores.
        }

        Map<String, Object> scope = new LinkedHashMap<String, Object>();
        String supervisorNombreObjetivo = "CENTRAL".equalsIgnoreCase(rolConsulta) ? trimToNull(supervisorNombre) : null;
        if (supervisorObjetivo != null) {
            // Si ya filtramos por idSupervisor, no forzar match por supervisor_1 de NPS.
            supervisorNombreObjetivo = null;
        }
        scope.put("idUsuarioSesion", idUsuarioSesion);
        scope.put("idSucursal", sucursalObjetivo);
        scope.put("idSupervisor", supervisorObjetivo);
        scope.put("idTecnico", tecnicoObjetivo);
        scope.put("supervisorNombre", supervisorNombreObjetivo);
        scope.put("tecnicoNombre",
                "TECNICO".equalsIgnoreCase(rolConsulta)
                        ? trimToNull(tecnicoNombre)
                        : ("CENTRAL".equalsIgnoreCase(rolConsulta) || "SUPERVISOR".equalsIgnoreCase(rolConsulta)
                            ? trimToNull(tecnicoNombre)
                            : null)
        );
        scope.put("scope", rolConsulta);
        return scope;
    }

    private Map<String, Object> obtenerFiltrosInterno(Map<String, Object> scope) {
        Integer idUsuarioSesion = (Integer) scope.get("idUsuarioSesion");
        Integer sucursalObjetivo = (Integer) scope.get("idSucursal");
        Integer supervisorObjetivo = (Integer) scope.get("idSupervisor");
        String rolConsulta = (String) scope.get("scope");
        JdbcTemplate sucursalTemplate = resolveSucursalTemplate(sucursalObjetivo);
        JdbcTemplate centralTemplate = dbConnectionManager.connDb("central");
        String supervisorNombre = (String) scope.get("supervisorNombre");

        List<Map<String, Object>> supervisoresConformacion = repository.listarSupervisoresSucursal(sucursalTemplate, sucursalObjetivo);
        List<Map<String, Object>> filtrosSupervisores = supervisoresConformacion;
        List<Map<String, Object>> filtrosTecnicos;

        if ("TECNICO".equalsIgnoreCase(rolConsulta)) {
            filtrosTecnicos = repository.listarTecnicosPorSupervisor(
                    sucursalTemplate,
                    sucursalObjetivo,
                    supervisorObjetivo == null ? 0 : supervisorObjetivo
            );
            Integer idTecnicoScope = asInteger(scope.get("idTecnico"));
            String tecnicoNombreScope = asText(scope.get("tecnicoNombre"));
            String tecnicoNombreScopeKey = normalizeKey(tecnicoNombreScope);
            List<Map<String, Object>> propios = new ArrayList<Map<String, Object>>();
            for (Map<String, Object> row : filtrosTecnicos) {
                Integer idFila = asInteger(find(row, "idTecnico", "id_tecnico", "idUsuario", "id_usuario"));
                String nombreFila = asText(find(row, "tecnico", "nombre", "tecnico_nombre"));
                boolean coincideIdTecnico = idTecnicoScope != null && idFila != null && idTecnicoScope.equals(idFila);
                boolean coincideIdSesion = idUsuarioSesion.equals(idFila);
                boolean coincideNombre = !isBlank(tecnicoNombreScopeKey) && tecnicoNombreScopeKey.equals(normalizeKey(nombreFila));
                if (coincideIdTecnico || coincideIdSesion || coincideNombre) {
                    propios.add(row);
                }
            }
            filtrosTecnicos = propios;
        } else if ("SUPERVISOR".equalsIgnoreCase(rolConsulta)) {
            filtrosTecnicos = repository.listarTecnicosPorSupervisor(sucursalTemplate, sucursalObjetivo, supervisorObjetivo);
            List<Map<String, Object>> historicos = repository.listarTecnicosHistoricosSupervisorNps(centralTemplate, supervisorObjetivo, sucursalObjetivo);
            filtrosTecnicos = mergeTecnicosSinDuplicados(filtrosTecnicos, historicos);
        } else {
            List<Map<String, Object>> filtroCentral = repository.listarFiltrosCentralPorNombres(centralTemplate, sucursalObjetivo);
            List<Map<String, Object>> sup = new ArrayList<Map<String, Object>>();
            List<Map<String, Object>> tec = new ArrayList<Map<String, Object>>();
            for (Map<String, Object> row : filtroCentral) {
                String tipo = asText(find(row, "tipo"));
                String nombre = asText(find(row, "nombre"));
                if (isBlank(nombre)) continue;
                Map<String, Object> out = new LinkedHashMap<String, Object>();
                if ("SUPERVISOR".equalsIgnoreCase(tipo)) {
                    out.put("idSupervisor", nombre);
                    out.put("supervisor", nombre);
                    sup.add(out);
                } else if ("TECNICO".equalsIgnoreCase(tipo)) {
                    if (!isBlank(supervisorNombre)) {
                        String supRow = asText(find(row, "supervisor"));
                        if (!supervisorNombre.equalsIgnoreCase(supRow)) continue;
                    }
                    out.put("idTecnico", nombre);
                    out.put("tecnico", nombre);
                    tec.add(out);
                }
            }
            filtrosSupervisores = sup;
            filtrosTecnicos = tec;
            if (filtrosTecnicos.isEmpty() && supervisorObjetivo != null) {
                filtrosTecnicos = repository.listarTecnicosPorSupervisor(sucursalTemplate, sucursalObjetivo, supervisorObjetivo);
            } else if (filtrosTecnicos.isEmpty()) {
                filtrosTecnicos = new ArrayList<Map<String, Object>>();
            }
            if (filtrosSupervisores.isEmpty()) {
                filtrosSupervisores = repository.listarSupervisoresSucursal(sucursalTemplate, sucursalObjetivo);
            }
            if (filtrosTecnicos.isEmpty() && supervisorObjetivo != null) {
                filtrosTecnicos = repository.listarTecnicosPorSupervisor(sucursalTemplate, sucursalObjetivo, supervisorObjetivo);
            } else if (filtrosTecnicos.isEmpty()) {
                filtrosTecnicos = repository.listarTecnicosPorSupervisor(sucursalTemplate, sucursalObjetivo, 0);
            }
            if (filtrosTecnicos.isEmpty()) {
                filtrosTecnicos = new ArrayList<Map<String, Object>>();
            }
            if (filtrosSupervisores.isEmpty()) {
                filtrosSupervisores = new ArrayList<Map<String, Object>>();
            }
            if (filtrosTecnicos == null) {
                filtrosTecnicos = new ArrayList<Map<String, Object>>();
            }
            if (filtrosSupervisores == null) {
                filtrosSupervisores = new ArrayList<Map<String, Object>>();
            }
            if (filtrosTecnicos.size() > 0 || filtrosSupervisores.size() > 0) {
                // ya resuelto por nombres desde NPS
            } else if (supervisorObjetivo != null) {
                filtrosTecnicos = repository.listarTecnicosPorSupervisor(sucursalTemplate, sucursalObjetivo, supervisorObjetivo);
            } else {
                filtrosTecnicos = repository.listarTecnicosPorSupervisor(sucursalTemplate, sucursalObjetivo, 0);
            }
        }

        // Regla de filtros:
        // 1) Supervisores: siempre todos los existentes en conformacion de cuadrillas.
        // 2) Tecnicos: todos los tecnicos del supervisor/sucursal, aunque aun no tengan respuesta NPS.
        filtrosSupervisores = supervisoresConformacion == null ? new ArrayList<Map<String, Object>>() : supervisoresConformacion;
        List<Map<String, Object>> tecnicosConformacion = listarTecnicosFiltroSupervision(
                sucursalTemplate,
                sucursalObjetivo,
                supervisorObjetivo == null ? 0 : supervisorObjetivo
        );
        if ((tecnicosConformacion == null || tecnicosConformacion.isEmpty()) && supervisorObjetivo != null) {
            // Fallback: cuando la sucursal no tiene conformacion local cargada, usar historico central.
            tecnicosConformacion = repository.listarTecnicosHistoricosSupervisorNps(
                    centralTemplate,
                    supervisorObjetivo,
                    sucursalObjetivo
            );
        }
        filtrosTecnicos = tecnicosConformacion == null ? new ArrayList<Map<String, Object>>() : tecnicosConformacion;

        // UX/Regla: para rol TECNICO no exponer selectores con multiples opciones.
        // Se devuelve solo su supervisor y su tecnico para que el front no tenga nada que seleccionar.
        if ("TECNICO".equalsIgnoreCase(rolConsulta)) {
            filtrosSupervisores = filtrarSupervisorTecnico(
                    filtrosSupervisores,
                    supervisorObjetivo,
                    idUsuarioSesion
            );
            filtrosTecnicos = filtrarTecnicoPropio(
                    filtrosTecnicos,
                    scope
            );
        }

        Map<String, Object> filtros = new HashMap<String, Object>();
        filtros.put("supervisores", filtrosSupervisores);
        filtros.put("tecnicos", filtrosTecnicos);
        return filtros;
    }

    private List<Map<String, Object>> listarTecnicosFiltroSupervision(
            JdbcTemplate sucursalTemplate,
            Integer idSucursal,
            Integer idSupervisor
    ) {
        if (idSupervisor != null && idSupervisor > 0) {
            String sucursalNombre = resolveSucursalNombre(idSucursal);
            if (!isBlank(sucursalNombre)) {
                try {
                    List<Map<String, Object>> tecnicos = supervisionRepository.listarTecnicosPorSupervisor(idSupervisor, sucursalNombre);
                    if (tecnicos != null && !tecnicos.isEmpty()) {
                        return tecnicos;
                    }
                } catch (Exception ignored) {
                    // Mantener fallback NPS si la consulta de supervision no esta disponible.
                }
            }
        }
        return repository.listarTecnicosPorSupervisor(sucursalTemplate, idSucursal, idSupervisor);
    }

    private List<Map<String, Object>> filtrarSupervisorTecnico(
            List<Map<String, Object>> supervisores,
            Integer idSupervisorObjetivo,
            Integer idUsuarioSesion
    ) {
        List<Map<String, Object>> out = new ArrayList<Map<String, Object>>();
        Integer idObjetivo = idSupervisorObjetivo == null ? idUsuarioSesion : idSupervisorObjetivo;
        if (idObjetivo == null || supervisores == null) {
            return out;
        }
        for (Map<String, Object> row : supervisores) {
            Integer id = asInteger(find(row, "idSupervisor", "id_supervisor", "idUsuarioSupervisor", "id_usuario_supervisor"));
            if (id == null || !id.equals(idObjetivo)) {
                continue;
            }
            out.add(row);
            break;
        }
        return out;
    }

    private List<Map<String, Object>> filtrarTecnicoPropio(
            List<Map<String, Object>> tecnicos,
            Map<String, Object> scope
    ) {
        List<Map<String, Object>> out = new ArrayList<Map<String, Object>>();
        if (tecnicos == null || tecnicos.isEmpty()) {
            return out;
        }
        Integer idTecnicoScope = asInteger(scope.get("idTecnico"));
        String tecnicoNombreScope = asText(scope.get("tecnicoNombre"));
        String tecnicoNombreScopeKey = normalizeKey(tecnicoNombreScope);
        for (Map<String, Object> row : tecnicos) {
            Integer id = asInteger(find(row, "idTecnico", "id_tecnico", "idUsuario", "id_usuario"));
            String nombre = asText(find(row, "tecnico", "nombre", "tecnico_nombre"));
            String key = normalizeKey(nombre);
            if (idTecnicoScope != null && id != null && idTecnicoScope.equals(id)) {
                out.add(row);
                break;
            }
            if (!isBlank(tecnicoNombreScopeKey) && tecnicoNombreScopeKey.equals(key)) {
                out.add(row);
                break;
            }
        }
        return out;
    }

    private String resolveNombreTecnicoSesion(
            JdbcTemplate sucursalTemplate,
            Integer idSucursal,
            Integer idSupervisor,
            Integer idTecnicoScope,
            Integer idUsuarioSesion
    ) {
        List<Map<String, Object>> tecnicos = repository.listarTecnicosPorSupervisor(
                sucursalTemplate,
                idSucursal,
                idSupervisor == null ? 0 : idSupervisor
        );
        if (tecnicos == null || tecnicos.isEmpty()) return null;
        for (Map<String, Object> row : tecnicos) {
            Integer idFila = asInteger(find(row, "idTecnico", "id_tecnico", "idUsuario", "id_usuario"));
            String nombre = trimToNull(asText(find(row, "tecnico", "nombre", "tecnico_nombre")));
            if (idTecnicoScope != null && idFila != null && idTecnicoScope.equals(idFila)) {
                return nombre;
            }
            if (idFila != null && idUsuarioSesion != null && idUsuarioSesion.equals(idFila)) {
                return nombre;
            }
        }
        return null;
    }

    private Integer resolveSupervisorDelTecnico(JdbcTemplate centralTemplate, Integer idSucursal, Integer idTecnico) {
        List<Map<String, Object>> rows = repository.listarTecnicosDeSupervisorEnCentral(centralTemplate, idTecnico, idSucursal);
        for (Map<String, Object> row : rows) {
            Integer supervisor = asInteger(find(row, "idSupervisor", "id_supervisor", "idUsuarioSupervisor", "id_usuario_supervisor"));
            if (supervisor != null) return supervisor;
        }
        return null;
    }

    private JdbcTemplate resolveSucursalTemplate(Integer idSucursal) {
        List<SucursalResponse> sucursales = authService.listarSucursales();
        for (SucursalResponse s : sucursales) {
            if (s != null && idSucursal.equals(s.getIdSucursal())) {
                return dbConnectionManager.connDb(
                        "nps-sucursal-" + idSucursal,
                        s.getIp(),
                        s.getBaseDeDatos(),
                        defaultDbUsername,
                        defaultDbPassword
                );
            }
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Sucursal no encontrada: " + idSucursal);
    }

    private String resolveSucursalNombre(Integer idSucursal) {
        if (idSucursal == null) return null;
        List<SucursalResponse> sucursales = authService.listarSucursales();
        for (SucursalResponse s : sucursales) {
            if (s != null && idSucursal.equals(s.getIdSucursal())) {
                return SucursalCanonicalizer.canonicalize(s.getSucursal());
            }
        }
        return null;
    }

    private boolean isRol(AuthLoginResponse usuario, String valor) {
        String rol = usuario == null ? null : usuario.getRol();
        if (rol == null) return false;
        return rol.trim().equalsIgnoreCase(valor);
    }

    private boolean isRolCentral(AuthLoginResponse usuario) {
        String rol = usuario == null ? null : usuario.getRol();
        if (rol == null) return false;
        String n = rol.trim().toLowerCase();
        return n.contains("central") || n.contains("sistema") || n.contains("admin");
    }

    private AuthLoginResponse requireUsuario(AuthMeResponse me) {
        AuthLoginResponse u = me == null ? null : me.getUsuario();
        if (u == null || u.getIdUsuario() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_INVALID", "Sesion invalida.");
        }
        return u;
    }

    private Integer requireParam(Integer value, String field) {
        if (value == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", field + " es requerido para usuario central.");
        }
        return value;
    }

    private Object find(Map<String, Object> row, String... keys) {
        if (row == null) return null;
        for (String key : keys) {
            for (Map.Entry<String, Object> e : row.entrySet()) {
                if (e.getKey() != null && e.getKey().equalsIgnoreCase(key)) return e.getValue();
            }
        }
        return null;
    }

    private Integer asInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Number) return ((Number) value).intValue();
        try {
            String text = String.valueOf(value).trim();
            if (text.isEmpty()) return null;
            return Integer.parseInt(text);
        } catch (Exception ex) {
            return null;
        }
    }

    private String asText(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private List<Map<String, Object>> mergeTecnicosSinDuplicados(
            List<Map<String, Object>> actuales,
            List<Map<String, Object>> historicos) {
        List<Map<String, Object>> out = new ArrayList<Map<String, Object>>();
        Map<String, Boolean> seen = new LinkedHashMap<String, Boolean>();
        addTecnicos(out, seen, actuales);
        addTecnicos(out, seen, historicos);
        return out;
    }

    private List<Map<String, Object>> interseccionTecnicosConNps(
            JdbcTemplate centralTemplate,
            Integer idSucursal,
            List<Map<String, Object>> candidatos,
            List<Map<String, Object>> tecnicosConformacion) {
        List<Map<String, Object>> filtrosNps = repository.listarFiltrosCentralPorNombres(centralTemplate, idSucursal);
        Set<String> tecnicosNps = new HashSet<String>();
        for (Map<String, Object> row : filtrosNps) {
            String tipo = asText(find(row, "tipo"));
            if (!"TECNICO".equalsIgnoreCase(tipo)) continue;
            String nombre = asText(find(row, "nombre", "tecnico", "tecnico_nombre"));
            if (!isBlank(nombre)) tecnicosNps.add(normalizeKey(nombre));
        }

        Map<String, Map<String, Object>> baseConformacion = new LinkedHashMap<String, Map<String, Object>>();
        addTecnicos(baseConformacion, tecnicosConformacion);

        // Fallback de negocio:
        // si el catalogo NPS central no trae tecnicos para la sucursal, no vaciar filtros;
        // usar los tecnicos de conformacion local del supervisor/sucursal.
        if (tecnicosNps.isEmpty()) {
            return new ArrayList<Map<String, Object>>(baseConformacion.values());
        }

        List<Map<String, Object>> out = new ArrayList<Map<String, Object>>();
        Set<String> seen = new HashSet<String>();
        if (candidatos != null) {
            for (Map<String, Object> row : candidatos) {
                String nombre = asText(find(row, "tecnico", "nombre", "tecnico_nombre", "idTecnico", "id_tecnico"));
                if (isBlank(nombre)) continue;
                String key = normalizeKey(nombre);
                if (!tecnicosNps.contains(key)) continue;
                Map<String, Object> fromConformacion = baseConformacion.get(key);
                if (fromConformacion == null) continue;
                if (seen.contains(key)) continue;
                out.add(fromConformacion);
                seen.add(key);
            }
        }

        // Fallback: si no hubo candidatos, usar toda la interseccion conformacion âˆ© NPS
        if (out.isEmpty()) {
            for (Map.Entry<String, Map<String, Object>> e : baseConformacion.entrySet()) {
                if (!tecnicosNps.contains(e.getKey())) continue;
                out.add(e.getValue());
            }
        }
        return out;
    }

    private List<Map<String, Object>> filtrarDashboardPorInterseccionTecnicos(
            JdbcTemplate centralTemplate,
            JdbcTemplate sucursalTemplate,
            Integer idSucursal,
            Integer idSupervisor,
            String tecnicoSeleccionado,
            List<Map<String, Object>> rows) {
        if (rows == null || rows.isEmpty()) return rows == null ? new ArrayList<Map<String, Object>>() : rows;
        List<Map<String, Object>> tecnicosConformacion =
                repository.listarTecnicosPorSupervisor(sucursalTemplate, idSucursal, idSupervisor == null ? 0 : idSupervisor);
        if ((tecnicosConformacion == null || tecnicosConformacion.isEmpty()) && idSupervisor != null) {
            // Fallback para supervisor: usar historico central cuando no existe relacion local.
            tecnicosConformacion = repository.listarTecnicosHistoricosSupervisorNps(
                    centralTemplate,
                    idSupervisor,
                    idSucursal
            );
        }
        if (tecnicosConformacion == null || tecnicosConformacion.isEmpty()) {
            // Ultimo fallback: no filtrar para evitar dejar dashboard en blanco por falta de catalogo local.
            return rows;
        }
        List<Map<String, Object>> interseccion =
                interseccionTecnicosConNps(centralTemplate, idSucursal, tecnicosConformacion, tecnicosConformacion);
        Set<String> allowed = new HashSet<String>();
        for (Map<String, Object> t : interseccion) {
            String nombre = asText(find(t, "tecnico", "nombre", "tecnico_nombre", "idTecnico", "id_tecnico"));
            if (!isBlank(nombre)) allowed.add(normalizeKey(nombre));
        }
        String tecnicoSeleccionadoKey = normalizeKey(tecnicoSeleccionado);
        if (allowed.isEmpty() && isBlank(tecnicoSeleccionadoKey)) return new ArrayList<Map<String, Object>>();
        List<Map<String, Object>> out = new ArrayList<Map<String, Object>>();
        for (Map<String, Object> row : rows) {
            String tecnico = asText(find(row, "tecnico_nombre", "tecnico", "nombre"));
            String tecnicoKey = normalizeKey(tecnico);
            if (allowed.contains(tecnicoKey)) {
                out.add(row);
                continue;
            }
            if (!isBlank(tecnicoSeleccionadoKey) && tecnicoSeleccionadoKey.equals(tecnicoKey)) {
                Map<String, Object> clone = new LinkedHashMap<String, Object>(row);
                clone.put("_npsHistorico", true);
                out.add(clone);
            }
        }
        return out;
    }

    private void addTecnicos(Map<String, Map<String, Object>> out, List<Map<String, Object>> source) {
        if (source == null) return;
        for (Map<String, Object> row : source) {
            Object idObj = find(row, "idTecnico", "id_tecnico");
            String nombre = asText(find(row, "tecnico", "nombre", "tecnico_nombre"));
            if (isBlank(nombre)) nombre = asText(idObj);
            if (isBlank(nombre)) continue;
            String key = normalizeKey(nombre);
            if (out.containsKey(key)) continue;
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            if (idObj != null && !isBlank(asText(idObj))) item.put("idTecnico", idObj);
            else item.put("idTecnico", nombre);
            item.put("tecnico", nombre);
            out.put(key, item);
        }
    }

    private void addTecnicos(
            List<Map<String, Object>> out,
            Map<String, Boolean> seen,
            List<Map<String, Object>> source) {
        if (source == null) return;
        for (Map<String, Object> row : source) {
            Object idObj = find(row, "idTecnico", "id_tecnico");
            String nombre = asText(find(row, "tecnico", "nombre", "tecnico_nombre"));
            if (isBlank(nombre)) {
                nombre = asText(idObj);
            }
            if (isBlank(nombre)) continue;
            String key = normalizeKey(nombre);
            if (seen.containsKey(key)) continue;
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            if (idObj != null && !isBlank(asText(idObj))) {
                item.put("idTecnico", idObj);
            } else {
                item.put("idTecnico", nombre);
            }
            item.put("tecnico", nombre);
            out.add(item);
            seen.put(key, true);
        }
    }

    private String normalizeKey(String value) {
        if (value == null) return "";
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return normalized.trim().toLowerCase();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
