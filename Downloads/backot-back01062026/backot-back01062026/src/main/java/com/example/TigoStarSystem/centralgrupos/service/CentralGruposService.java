package com.example.TigoStarSystem.centralgrupos.service;

import com.example.TigoStarSystem.auth.dto.AuthLoginResponse;
import com.example.TigoStarSystem.auth.dto.AuthMeResponse;
import com.example.TigoStarSystem.auth.dto.SucursalResponse;
import com.example.TigoStarSystem.auth.service.AuthService;
import com.example.TigoStarSystem.centralgrupos.repository.CentralGruposRepository;
import com.example.TigoStarSystem.common.ApiException;
import com.example.TigoStarSystem.config.DbConnectionManager;
import com.example.TigoStarSystem.supervisor.SucursalCanonicalizer;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

@Service
public class CentralGruposService {
    private final CentralGruposRepository repository;
    private final DbConnectionManager dbConnectionManager;
    private final AuthService authService;

    public CentralGruposService(
            CentralGruposRepository repository,
            DbConnectionManager dbConnectionManager,
            AuthService authService) {
        this.repository = repository;
        this.dbConnectionManager = dbConnectionManager;
        this.authService = authService;
    }

    public List<Map<String, Object>> listarGrupos(String token, String sucursal) {
        AuthLoginResponse usuario = requireCentralOrBackOffice(token);
        String sucursalResuelta = SucursalCanonicalizer.canonicalize(isBlank(sucursal) ? resolveSucursalDesdeUsuario(usuario) : sucursal);
        if (isBlank(sucursalResuelta)) {
            return new ArrayList<>();
        }
        return repository.listarGruposDesdeConformacionCentral(
                dbConnectionManager.connDb("bdcontrolordenes"),
                sucursalResuelta
        );
    }

    public List<Map<String, Object>> listarSupervisoresFiltro(String token, String sucursal) {
        AuthLoginResponse usuario = requireCentralOrBackOffice(token);
        JdbcTemplate template = resolveTemplate(sucursal, usuario);
        return repository.listarSupervisoresFiltro(template);
    }

    public List<Map<String, Object>> listarTecnicosFiltro(String token, String sucursal) {
        AuthLoginResponse usuario = requireCentralOrBackOffice(token);
        JdbcTemplate template = resolveTemplate(sucursal, usuario);
        return repository.listarTecnicosFiltro(template);
    }

    public Map<String, Object> crearGrupo(String token, String sucursal, String nombre) {
        AuthLoginResponse usuario = requireCentralOrBackOffice(token);
        JdbcTemplate template = resolveTemplate(sucursal, usuario);
        List<Map<String, Object>> rows = repository.crearGrupo(template, usuario.getIdUsuario(), nombre);
        if (rows == null || rows.isEmpty()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "NO_DATA", "No se pudo crear el grupo.");
        }
        return rows.get(0);
    }

    public Map<String, Object> asignarSupervisor(
            String token,
            String sucursal,
            Integer idGrupo,
            Integer idUsuarioSupervisor) {
        AuthLoginResponse usuario = requireCentralOrBackOffice(token);
        JdbcTemplate template = resolveTemplate(sucursal, usuario);
        String sucursalResuelta = SucursalCanonicalizer.canonicalize(isBlank(sucursal) ? resolveSucursalDesdeUsuario(usuario) : sucursal);
        List<Map<String, Object>> rows = new ArrayList<>();
        try {
            rows = repository.asignarSupervisor(template, usuario.getIdUsuario(), idGrupo, idUsuarioSupervisor);
        } catch (DataAccessException ignored) {
            // Fallback: en algunos entornos el SP de asignacion no existe/rompe.
        }
        if (rows == null) {
            rows = new ArrayList<>();
        }
        // Refleja el cambio en la fuente usada por el listado (conformacion diaria).
        List<Map<String, Object>> supervisores;
        try {
            supervisores = repository.listarSupervisoresFiltro(template);
        } catch (DataAccessException ex) {
            supervisores = new ArrayList<>();
        }
        String nombreSupervisor = findNombreSupervisor(supervisores, idUsuarioSupervisor);
        List<Map<String, Object>> gruposRows = repository.listarGruposDesdeConformacionCentral(
                dbConnectionManager.connDb("bdcontrolordenes"),
                sucursalResuelta
        );
        String nombreGrupo = findNombreGrupo(gruposRows, idGrupo);
        int actualizados = repository.actualizarSupervisorEnConformacionCentral(
                dbConnectionManager.connDb("bdcontrolordenes"),
                sucursalResuelta,
                nombreGrupo,
                idUsuarioSupervisor,
                nombreSupervisor
        );
        if (actualizados <= 0 && rows.isEmpty()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "NO_DATA", "No se pudo asignar supervisor al grupo.");
        }

        Map<String, Object> out = rows.isEmpty() ? new HashMap<>() : new HashMap<>(rows.get(0));
        out.put("actualizadosConformacion", actualizados);
        out.put("idGrupo", idGrupo);
        out.put("idSupervisor", idUsuarioSupervisor);
        return out;
    }

    public Map<String, Object> asignarTecnico(
            String token,
            String sucursal,
            Integer idGrupo,
            Integer idUsuarioTecnico) {
        AuthLoginResponse usuario = requireCentralOrBackOffice(token);
        JdbcTemplate template = resolveTemplate(sucursal, usuario);
        List<Map<String, Object>> rows = repository.asignarTecnico(template, usuario.getIdUsuario(), idGrupo, idUsuarioTecnico);
        if (rows == null || rows.isEmpty()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "NO_DATA", "No se pudo asignar tecnico al grupo.");
        }
        return rows.get(0);
    }

    public Map<String, Object> quitarTecnico(
            String token,
            String sucursal,
            Integer idGrupo,
            Integer idUsuarioTecnico) {
        AuthLoginResponse usuario = requireCentralOrBackOffice(token);
        JdbcTemplate template = resolveTemplate(sucursal, usuario);
        List<Map<String, Object>> rows = repository.quitarTecnico(template, usuario.getIdUsuario(), idGrupo, idUsuarioTecnico);
        if (rows == null || rows.isEmpty()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "NO_DATA", "No se pudo quitar tecnico del grupo.");
        }
        return rows.get(0);
    }

    public Map<String, Object> eliminarGrupo(
            String token,
            String sucursal,
            Integer idGrupo) {
        AuthLoginResponse usuario = requireCentralOrBackOffice(token);
        JdbcTemplate template = resolveTemplate(sucursal, usuario);
        List<Map<String, Object>> rows = repository.eliminarGrupo(template, usuario.getIdUsuario(), idGrupo);
        if (rows == null || rows.isEmpty()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "NO_DATA", "No se pudo eliminar el grupo.");
        }
        return rows.get(0);
    }

    public Map<String, Object> marcarSupervisorAusente(
            String token,
            String sucursal,
            Integer idGrupo,
            Integer idUsuarioTecnico) {
        AuthLoginResponse usuario = requireCentralOrBackOffice(token);
        JdbcTemplate template = resolveTemplate(sucursal, usuario);
        List<Map<String, Object>> rows = repository.marcarSupervisorAusente(template, usuario.getIdUsuario(), idGrupo, idUsuarioTecnico);
        if (rows == null || rows.isEmpty()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "NO_DATA", "No se pudo marcar supervisor ausente.");
        }
        return rows.get(0);
    }

    public Map<String, Object> restaurarSupervisor(
            String token,
            String sucursal,
            Integer idGrupo) {
        AuthLoginResponse usuario = requireCentralOrBackOffice(token);
        JdbcTemplate template = resolveTemplate(sucursal, usuario);
        List<Map<String, Object>> rows = repository.restaurarSupervisor(template, usuario.getIdUsuario(), idGrupo);
        if (rows == null || rows.isEmpty()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "NO_DATA", "No se pudo restaurar supervisor.");
        }
        return rows.get(0);
    }

    public Map<String, Object> cambiarColaboradorBackup(
            String token,
            String sucursal,
            Integer idGrupo,
            Integer idUsuarioTecnico) {
        AuthLoginResponse usuario = requireCentralOrBackOffice(token);
        JdbcTemplate template = resolveTemplate(sucursal, usuario);
        List<Map<String, Object>> rows = repository.cambiarColaboradorBackup(template, usuario.getIdUsuario(), idGrupo, idUsuarioTecnico);
        if (rows == null || rows.isEmpty()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "NO_DATA", "No se pudo cambiar colaborador temporal.");
        }
        return rows.get(0);
    }

    public Map<String, Object> cambiarSupervisorMasivo(
            String token,
            String sucursal,
            Integer idSupervisorOrigen,
            Integer idSupervisorDestino,
            List<Integer> idGrupos) {
        AuthLoginResponse usuario = requireCentralOrBackOffice(token);
        JdbcTemplate template = resolveTemplate(sucursal, usuario);
        String sucursalResuelta = SucursalCanonicalizer.canonicalize(isBlank(sucursal) ? resolveSucursalDesdeUsuario(usuario) : sucursal);

        if (idSupervisorOrigen == null || idSupervisorOrigen <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Supervisor origen es requerido.");
        }
        if (idSupervisorDestino == null || idSupervisorDestino <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Supervisor destino es requerido.");
        }
        if (idSupervisorOrigen.equals(idSupervisorDestino)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Supervisor origen y destino deben ser diferentes.");
        }
        List<Map<String, Object>> supervisores = repository.listarSupervisoresFiltro(template);
        String nombreOrigen = findNombreSupervisor(supervisores, idSupervisorOrigen);
        String nombreDestino = findNombreSupervisor(supervisores, idSupervisorDestino);
        if (isBlank(nombreOrigen) || isBlank(nombreDestino)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "No se pudo resolver supervisor origen/destino.");
        }

        List<Map<String, Object>> gruposRows = repository.listarGruposDesdeConformacionCentral(
                dbConnectionManager.connDb("bdcontrolordenes"),
                sucursalResuelta
        );
        List<Map<String, Object>> gruposObjetivo = resolverGruposObjetivoPorNombre(gruposRows, nombreOrigen, idGrupos);
        if (gruposObjetivo.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "No hay grupos para transferir.");
        }

        int actualizados = 0;
        List<Integer> aplicados = new ArrayList<>();
        for (Map<String, Object> row : gruposObjetivo) {
            Integer idGrupo = toInteger(row.get("id_grupo"));
            String nombreGrupo = toText(row.get("nombre"));
            int affected = repository.actualizarSupervisorEnConformacionCentral(
                    dbConnectionManager.connDb("bdcontrolordenes"),
                    sucursalResuelta,
                    nombreGrupo,
                    idSupervisorDestino,
                    nombreDestino
            );
            if (affected > 0) {
                actualizados += affected;
                if (idGrupo != null) {
                    aplicados.add(idGrupo);
                }
            }
        }

        Map<String, Object> out = new HashMap<>();
        out.put("actualizados", actualizados);
        out.put("idSupervisorOrigen", idSupervisorOrigen);
        out.put("idSupervisorDestino", idSupervisorDestino);
        out.put("idGruposAplicados", aplicados);
        return out;
    }

    private List<Map<String, Object>> resolverGruposObjetivoPorNombre(
            List<Map<String, Object>> gruposRows,
            String supervisorOrigen,
            List<Integer> idGruposSolicitados) {
        if (idGruposSolicitados != null && !idGruposSolicitados.isEmpty()) {
            List<Map<String, Object>> out = new ArrayList<>();
            for (Map<String, Object> row : gruposRows) {
                Integer id = toInteger(firstNonNull(row, "id_grupo", "idGrupo"));
                if (id != null && idGruposSolicitados.contains(id)) {
                    out.add(row);
                }
            }
            return out;
        }

        String origenNorm = normalize(supervisorOrigen);
        List<Map<String, Object>> origen = new ArrayList<>();
        for (Map<String, Object> row : gruposRows) {
            String supervisor = toText(firstNonNull(row, "supervisor", "supervisor_a_cargo", "supervisorACargo"));
            if (normalize(supervisor).equals(origenNorm)) {
                origen.add(row);
            }
        }
        return origen;
    }

    private Integer toInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Number) return ((Number) value).intValue();
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Object firstNonNull(Map<String, Object> row, String... keys) {
        for (String key : keys) {
            if (row.containsKey(key) && row.get(key) != null) {
                return row.get(key);
            }
        }
        return null;
    }

    private String toText(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String findNombreSupervisor(List<Map<String, Object>> supervisores, Integer idSupervisor) {
        if (idSupervisor == null) return "";
        for (Map<String, Object> row : supervisores) {
            Integer id = toInteger(firstNonNull(row, "idUsuarioSupervisor", "id_usuario_supervisor", "id_usuario", "id"));
            if (id != null && id.equals(idSupervisor)) {
                return toText(firstNonNull(row, "supervisorACargo", "supervisor", "nombre"));
            }
        }
        return "";
    }

    private String findNombreGrupo(List<Map<String, Object>> grupos, Integer idGrupo) {
        if (idGrupo == null) return "";
        for (Map<String, Object> row : grupos) {
            Integer id = toInteger(firstNonNull(row, "id_grupo", "idGrupo"));
            if (id != null && id.equals(idGrupo)) {
                return toText(firstNonNull(row, "nombre", "grupo"));
            }
        }
        return "";
    }

    private AuthLoginResponse requireCentralOrBackOffice(String token) {
        AuthMeResponse me = authService.me(token);
        AuthLoginResponse usuario = me.getUsuario();
        String rol = normalize(usuario == null ? null : usuario.getRol());
        if (!"central".equals(rol)
                && !"back office".equals(rol)
                && !"backoffice".equals(rol)
                && !"backoffice_v".equals(rol)
                && !"backup".equals(rol)) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN_CENTRAL_OR_BACKOFFICE_ONLY",
                    "Esta funcionalidad es solo para rol Central o Back Office."
            );
        }
        return usuario;
    }

    private JdbcTemplate resolveTemplate(String sucursalParam, AuthLoginResponse usuario) {
        String sucursal = SucursalCanonicalizer.canonicalize(sucursalParam);
        if (isBlank(sucursal)) {
            sucursal = resolveSucursalDesdeUsuario(usuario);
        }
        if ("sucre".equals(normalize(sucursal))) {
            return dbConnectionManager.connDb("sucre");
        }
        return dbConnectionManager.connDb("operativa");
    }

    private String resolveSucursalDesdeUsuario(AuthLoginResponse usuario) {
        if (usuario == null || usuario.getIdSucursal() == null) {
            return null;
        }
        Integer idSucursal = usuario.getIdSucursal();
        List<SucursalResponse> sucursales = authService.listarSucursales();
        for (SucursalResponse item : sucursales) {
            if (item != null && idSucursal.equals(item.getIdSucursal())) {
                return SucursalCanonicalizer.canonicalize(item.getSucursal());
            }
        }
        return null;
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
