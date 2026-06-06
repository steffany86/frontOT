package com.example.TigoStarSystem.supervisor.service;

import com.example.TigoStarSystem.supervisor.SucursalCanonicalizer;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

final class ConformacionCuadrillaRowMapper {
    /**
     * Elimina filas duplicadas usando el primer campo no nulo como llave.
     */
    List<Map<String, Object>> deduplicarPorPrimerCampoNoNulo(
            List<Map<String, Object>> rows,
            String... campos) {
        if (rows == null || rows.isEmpty()) {
            return rows;
        }

        List<Map<String, Object>> out = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (Map<String, Object> row : rows) {
            String key = valorNormalizado(row, campos);
            if (key == null) {
                out.add(row);
                continue;
            }
            if (seen.add(key)) {
                out.add(row);
            }
        }

        return out;
    }

    /**
     * Filtra filas por texto y aplica limite maximo de resultados.
     */
    List<Map<String, Object>> filtrarPorTextoYLimite(
            List<Map<String, Object>> rows,
            String q,
            Integer limit,
            String... camposBusqueda) {
        if (rows == null || rows.isEmpty()) {
            return rows;
        }

        String query = q == null ? null : q.trim();
        boolean filtrar = query != null && !query.isEmpty();
        String queryNorm = filtrar ? query.toUpperCase(Locale.ROOT) : null;
        int max = (limit == null || limit <= 0) ? Integer.MAX_VALUE : limit;

        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            if (filtrar) {
                String valor = valorNormalizado(row, camposBusqueda);
                if (valor == null || !valor.contains(queryNorm)) {
                    continue;
                }
            }
            out.add(row);
            if (out.size() >= max) {
                break;
            }
        }
        return out;
    }

    /**
     * Indexa tecnicos por id para busquedas rapidas durante el mapeo.
     */
    Map<Integer, Map<String, Object>> indexTecnicosById(List<Map<String, Object>> rows) {
        Map<Integer, Map<String, Object>> out = new HashMap<>();
        if (rows == null || rows.isEmpty()) {
            return out;
        }

        for (Map<String, Object> row : rows) {
            Integer id = toInteger(getCaseInsensitive(row, "id_tecnico", "id_vendedor", "idvendedor", "idtecnico"));
            if (id != null && !out.containsKey(id)) {
                out.put(id, row);
            }
        }
        return out;
    }

    /**
     * Construye clave estable de cuadrilla desde fila de catalogo.
     */
    String claveCuadrillaDesdeCatalogo(Map<String, Object> row) {
        Integer idTecnico = toInteger(getCaseInsensitive(row, "id_tecnico", "id_vendedor", "idvendedor"));
        if (idTecnico != null) {
            return "ID:" + idTecnico;
        }

        String grupo = toUpperTrimOrNull(toString(getCaseInsensitive(
                row,
                "grupo",
                "cuadrilla",
                "ruta",
                "nombre"
        )));
        return grupo == null ? null : "GRUPO:" + grupo;
    }

    /**
     * Construye clave estable de cuadrilla desde fila confirmada.
     */
    String claveCuadrillaDesdeConfirmada(Map<String, Object> row) {
        Integer idTecnico = toInteger(getCaseInsensitive(row, "id_tecnico", "idtecnico"));
        if (idTecnico != null) {
            return "ID:" + idTecnico;
        }

        String grupo = toUpperTrimOrNull(toString(getCaseInsensitive(
                row,
                "grupo",
                "ruta",
                "cuadrilla",
                "nombre"
        )));
        return grupo == null ? null : "GRUPO:" + grupo;
    }

    /**
     * Mapea una fila de catalogo a estructura de cuadrilla pendiente.
     */
    Map<String, Object> mapPendiente(
            Map<String, Object> row,
            String sucursal,
            LocalDate fecha,
            Map<Integer, Map<String, Object>> tecnicosById) {
        Map<String, Object> out = new LinkedHashMap<>();
        Object id = getCaseInsensitive(row, "id");
        Object vehiculo = getCaseInsensitive(
                row,
                "vehiculo",
                "Vehiculo",
                "placa",
                "placavehiculo",
                "placaVehiculo"
        );
        Object idTecnicoValue = getCaseInsensitive(row, "id_tecnico", "Id_Vendedor", "idvendedor", "idtecnico");
        Integer idTecnico = toInteger(idTecnicoValue);
        Map<String, Object> tecnicoRow = idTecnico == null || tecnicosById == null ? null : tecnicosById.get(idTecnico);

        String tecnicoNombre = trimToNull(toString(getCaseInsensitive(row, "tecnico", "nombrevendedor", "vendedor")));
        if (tecnicoNombre == null && tecnicoRow != null) {
            tecnicoNombre = trimToNull(toString(getCaseInsensitive(
                    tecnicoRow,
                    "tecnico",
                    "nombrevendedor",
                    "nombre",
                    "vendedor"
            )));
        }
        if (vehiculo == null && tecnicoRow != null) {
            vehiculo = getCaseInsensitive(tecnicoRow, "vehiculo", "placa", "placavehiculo", "placaVehiculo");
        }

        String sucursalResolved = SucursalCanonicalizer.canonicalize(firstNonBlank(
                trimToNull(toString(getCaseInsensitive(row, "sucursal", "Sucursal"))),
                trimToNull(sucursal)
        ));

        out.put("id", id);
        out.put("idRegistro", id);
        out.put("detalleApiDisponible", id != null);
        out.put("idRuta", getCaseInsensitive(row, "id_ruta", "Id_Ruta"));
        out.put("grupo", getCaseInsensitive(row, "cuadrilla", "grupo", "ruta", "Nombre"));
        out.put("ruta", getCaseInsensitive(row, "ruta", "cuadrilla", "Nombre"));
        out.put("idTecnico", idTecnicoValue);
        out.put("tecnico", tecnicoNombre);
        out.put("cuentaSf", firstNonBlank(
                trimToNull(toString(getCaseInsensitive(row, "cuenta_sf", "cuentasf", "cuentaSf"))),
                trimToNull(toString(getCaseInsensitive(tecnicoRow, "cuenta_sf", "cuentasf", "cuentaSf")))
        ));
        out.put("salesforce", firstNonBlank(
                trimToNull(toString(getCaseInsensitive(row, "salesforce"))),
                trimToNull(toString(getCaseInsensitive(tecnicoRow, "salesforce")))
        ));
        out.put("habilidad", firstNonBlank(
                trimToNull(toString(getCaseInsensitive(row, "habilidad"))),
                trimToNull(toString(getCaseInsensitive(tecnicoRow, "habilidad")))
        ));
        out.put("idTecnicoAuxiliar", getCaseInsensitive(
                row,
                "id_tecnicoAuxiliar",
                "idtecnicoauxiliar",
                "id_tecnico_auxiliar"
        ));
        out.put("auxiliar", getCaseInsensitive(row, "auxiliar", "tecnicoauxiliar", "nombreauxiliar"));
        out.put("almacen", getCaseInsensitive(row, "almacen", "almacen_tigo", "almacenTigo"));
        out.put("grupoDigitacion", getCaseInsensitive(
                row,
                "grupoDigitacion",
                "grupodigitacion",
                "almacen_tigo",
                "almacenTigo"
        ));
        out.put("idUsuarioDigitador", getCaseInsensitive(
                row,
                "idUsuarioDigitador",
                "id_usuario_digitador",
                "idusuariodigitador"
        ));
        out.put("digitador", getCaseInsensitive(row, "digitador", "nombredigitador", "usuarioDigitador"));

        Object idUsuarioSupervisor = getCaseInsensitive(
                row,
                "idUsuarioSupervisor",
                "id_usuario_supervisor",
                "idusuariosupervisor",
                "idsupervisor"
        );
        out.put("idUsuarioSupervisor", idUsuarioSupervisor);
        out.put("supervisorACargo", getCaseInsensitive(
                row,
                "supervisorACargo",
                "supervisor_a_cargo",
                "supervisor",
                "nombresupervisor"
        ));

        out.put("actividad", getCaseInsensitive(row, "actividad", "tipoactividad", "tipo"));
        out.put("estado", "PENDIENTE");
        out.put("vehiculo", vehiculo);
        out.put("Vehiculo", vehiculo);
        out.put("sucursal", sucursalResolved);
        out.put("Sucursal", sucursalResolved);

        Object fechaValue = getCaseInsensitive(row, "fecha");
        out.put("fecha", fechaValue == null ? (fecha == null ? null : fecha.toString()) : fechaValue);
        out.put("observacion", getCaseInsensitive(row, "observacion"));

        Object idUsuarioRegistra = getCaseInsensitive(
                row,
                "idUsuarioRegistra",
                "id_usuario_registra",
                "idusuarioregistra"
        );
        if (idUsuarioRegistra == null) {
            idUsuarioRegistra = idUsuarioSupervisor;
        }
        out.put("idUsuarioRegistra", idUsuarioRegistra);
        out.put("fechaRegistro", getCaseInsensitive(row, "fechaRegistro", "fecha_registro"));
        out.put("tipo", getCaseInsensitive(row, "tipo"));
        out.put("visible", getCaseInsensitive(row, "visible"));
        out.put("bodegaTigo", getCaseInsensitive(row, "bodega_tigo", "BodegaTigo"));
        out.put("almacenTigo", getCaseInsensitive(row, "almacen_tigo", "almacenTigo"));
        out.put("eEliminado", false);
        out.put("eliminado", false);
        out.put("confirmada", false);
        applyConformacionAliases(out);
        return out;
    }

    /**
     * Mapea una fila persistida a estructura de cuadrilla confirmada.
     */
    Map<String, Object> mapConfirmada(Map<String, Object> row, String sucursalFiltro, LocalDate fechaFiltro) {
        Map<String, Object> out = new LinkedHashMap<>();
        Object vehiculo = getCaseInsensitive(row, "vehiculo", "Vehiculo", "placa", "placavehiculo", "placaVehiculo");
        String sucursalResolved = SucursalCanonicalizer.canonicalize(firstNonBlank(
                trimToNull(toString(getCaseInsensitive(row, "sucursal", "Sucursal"))),
                trimToNull(sucursalFiltro)
        ));
        Object idRegistro = getCaseInsensitive(row, "id");

        out.put("id", idRegistro);
        out.put("idRegistro", idRegistro);
        out.put("detalleApiDisponible", idRegistro != null);
        out.put("idRuta", getCaseInsensitive(row, "idruta", "id_ruta", "Id_Ruta"));
        out.put("grupo", getCaseInsensitive(row, "grupo", "ruta", "cuadrilla"));
        out.put("ruta", getCaseInsensitive(row, "ruta", "grupo", "cuadrilla"));
        out.put("idTecnico", getCaseInsensitive(row, "id_tecnico", "idtecnico", "id_vendedor", "idvendedor"));
        out.put("tecnico", getCaseInsensitive(row, "tecnico", "nombrevendedor", "vendedor"));
        out.put("cuentaSf", getCaseInsensitive(row, "cuenta_sf", "cuentasf", "cuentaSf"));
        out.put("salesforce", getCaseInsensitive(row, "salesforce"));
        out.put("habilidad", getCaseInsensitive(row, "habilidad"));
        out.put("idTecnicoAuxiliar", getCaseInsensitive(
                row,
                "id_tecnicoAuxiliar",
                "idtecnicoauxiliar",
                "id_tecnico_auxiliar"
        ));
        out.put("auxiliar", getCaseInsensitive(row, "auxiliar", "tecnicoauxiliar", "nombreauxiliar"));
        out.put("actividad", getCaseInsensitive(row, "actividad", "tipoactividad"));
        out.put("almacen", getCaseInsensitive(row, "almacen"));
        out.put("grupoDigitacion", getCaseInsensitive(row, "grupoDigitacion", "grupodigitacion"));
        out.put("idUsuarioDigitador", getCaseInsensitive(
                row,
                "idUsuarioDigitador",
                "id_usuario_digitador",
                "idusuariodigitador"
        ));
        out.put("digitador", getCaseInsensitive(row, "digitador", "nombredigitador", "usuarioDigitador"));

        Object idUsuarioSupervisor = getCaseInsensitive(
                row,
                "idUsuarioSupervisor",
                "id_usuario_supervisor",
                "idusuariosupervisor",
                "idsupervisor"
        );
        out.put("idUsuarioSupervisor", idUsuarioSupervisor);
        out.put("supervisorACargo", getCaseInsensitive(
                row,
                "supervisorACargo",
                "supervisor_a_cargo",
                "supervisor",
                "nombresupervisor"
        ));
        out.put("estado", getCaseInsensitive(row, "estado"));
        out.put("vehiculo", vehiculo);
        out.put("Vehiculo", vehiculo);
        out.put("sucursal", sucursalResolved);
        out.put("Sucursal", sucursalResolved);

        Object fecha = getCaseInsensitive(row, "fecha");
        out.put("fecha", fecha == null ? (fechaFiltro == null ? null : fechaFiltro.toString()) : fecha);
        out.put("observacion", getCaseInsensitive(row, "observacion"));

        Object idUsuarioRegistra = getCaseInsensitive(
                row,
                "idUsuarioRegistra",
                "id_usuario_registra",
                "idusuarioregistra"
        );
        if (idUsuarioRegistra == null) {
            idUsuarioRegistra = idUsuarioSupervisor;
        }
        out.put("idUsuarioRegistra", idUsuarioRegistra);
        out.put("fechaRegistro", getCaseInsensitive(row, "fechaRegistro", "fecha_registro"));

        boolean eliminado = isEliminado(row);
        out.put("eEliminado", eliminado);
        out.put("eliminado", eliminado);
        out.put("confirmada", true);
        applyConformacionAliases(out);
        return out;
    }

    /**
     * Determina si una fila esta marcada como eliminada.
     */
    boolean isEliminado(Map<String, Object> row) {
        Boolean eliminado = toBoolean(getCaseInsensitive(row, "e_eliminado", "eeliminado", "eliminado"));
        return Boolean.TRUE.equals(eliminado);
    }

    /**
     * Obtiene valor normalizado en mayusculas del primer campo con dato.
     */
    private String valorNormalizado(Map<String, Object> row, String... campos) {
        if (row == null || campos == null) {
            return null;
        }

        for (String campo : campos) {
            Object value = getCaseInsensitive(row, campo);
            if (value == null) {
                continue;
            }
            String text = value.toString().trim();
            if (!text.isEmpty()) {
                return text.toUpperCase(Locale.ROOT);
            }
        }
        return null;
    }

    /**
     * Replica aliases de columnas para mantener compatibilidad entre vistas.
     */
    private void applyConformacionAliases(Map<String, Object> out) {
        if (out == null || out.isEmpty()) {
            return;
        }
        putAlias(out, "id", "Id");
        putAlias(out, "idRuta", "id_ruta", "idruta", "Id_Ruta");
        putAlias(out, "idTecnico", "id_tecnico", "idtecnico", "Id_Tecnico", "id_vendedor", "idvendedor");
        putAlias(out, "cuentaSf", "cuenta_sf", "cuentasf");
        putAlias(out, "idTecnicoAuxiliar", "id_tecnicoAuxiliar", "id_tecnico_auxiliar", "idtecnicoauxiliar");
        putAlias(out, "grupoDigitacion", "grupodigitacion");
        putAlias(out, "idUsuarioDigitador", "id_usuario_digitador", "idusuariodigitador");
        putAlias(out, "idUsuarioSupervisor", "id_usuario_supervisor", "idusuariosupervisor");
        putAlias(out, "supervisorACargo", "supervisor_a_cargo", "supervisor");
        putAlias(out, "idUsuarioRegistra", "id_usuario_registra", "idusuarioregistra");
        putAlias(out, "fechaRegistro", "fecha_registro");
        putAlias(out, "eEliminado", "e_eliminado");
    }

    /**
     * Copia valor canonico a aliases faltantes.
     */
    private void putAlias(Map<String, Object> out, String canonical, String... aliases) {
        if (out == null || canonical == null) {
            return;
        }

        Object value = out.get(canonical);
        if (value == null) {
            for (String alias : aliases) {
                if (out.containsKey(alias) && out.get(alias) != null) {
                    value = out.get(alias);
                    out.put(canonical, value);
                    break;
                }
            }
        }
        if (value == null) {
            return;
        }

        for (String alias : aliases) {
            if (!out.containsKey(alias) || out.get(alias) == null) {
                out.put(alias, value);
            }
        }
    }

    /**
     * Busca el primer valor encontrado para cualquiera de las claves candidatas.
     */
    private Object getCaseInsensitive(Map<String, Object> row, String... keys) {
        if (row == null || keys == null) {
            return null;
        }
        for (String key : keys) {
            Object value = getCaseInsensitive(row, key);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    /**
     * Busca valor por clave ignorando mayusculas/minusculas y guiones bajos.
     */
    private Object getCaseInsensitive(Map<String, Object> row, String targetKey) {
        if (row == null || targetKey == null) {
            return null;
        }
        String normalizedTarget = normalizeKey(targetKey);
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            if (normalizeKey(entry.getKey()).equals(normalizedTarget)) {
                return entry.getValue();
            }
        }
        return null;
    }

    /**
     * Normaliza una clave para comparaciones case-insensitive.
     */
    private String normalizeKey(String key) {
        if (key == null) {
            return "";
        }
        return key.replace("_", "").trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Convierte un valor dinamico a Integer de forma segura.
     */
    private Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(value.toString().trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    /**
     * Convierte un valor dinamico a Boolean.
     */
    private Boolean toBoolean(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue() != 0;
        }

        String normalized = value.toString().trim().toLowerCase(Locale.ROOT);
        if (normalized.equals("1") || normalized.equals("true") || normalized.equals("si") || normalized.equals("s")) {
            return true;
        }
        if (normalized.equals("0") || normalized.equals("false") || normalized.equals("no") || normalized.equals("n")) {
            return false;
        }
        return null;
    }

    /**
     * Convierte un valor dinamico a String.
     */
    private String toString(Object value) {
        return value == null ? null : value.toString();
    }

    /**
     * Retorna null para cadenas vacias y trim para cadenas con valor.
     */
    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Retorna preferred cuando existe; si no, fallback.
     */
    private String firstNonBlank(String preferred, String fallback) {
        return preferred != null ? preferred : fallback;
    }

    /**
     * Convierte una cadena a mayusculas y null si esta vacia.
     */
    private String toUpperTrimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.toUpperCase(Locale.ROOT);
    }
}
