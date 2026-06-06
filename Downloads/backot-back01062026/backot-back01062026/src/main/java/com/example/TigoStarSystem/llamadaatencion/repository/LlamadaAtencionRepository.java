package com.example.TigoStarSystem.llamadaatencion.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Repository
public class LlamadaAtencionRepository {
    private final JdbcTemplate tigohogarJdbcTemplate;

    public LlamadaAtencionRepository(@Qualifier("tigohogarJdbcTemplate") JdbcTemplate tigohogarJdbcTemplate) {
        this.tigohogarJdbcTemplate = tigohogarJdbcTemplate;
    }

    public List<Map<String, Object>> listarTiposComunicacion() {
        return tigohogarJdbcTemplate.queryForList(
                "EXEC dbo.spx_ListarTipoComunicacionLlamadaAtencion"
        );
    }

    public List<Map<String, Object>> listarLlamadasAtencion(
            String idTecnico,
            LocalDate fechaDesde,
            LocalDate fechaHasta,
            Integer limite,
            Integer idSucursal) {
        return tigohogarJdbcTemplate.queryForList(
                "EXEC dbo.spx_ListarLlamadaAtencion ?, ?, ?, ?, ?",
                trimToNull(idTecnico),
                fechaDesde == null ? null : Date.valueOf(fechaDesde),
                fechaHasta == null ? null : Date.valueOf(fechaHasta),
                resolveLimit(limite),
                idSucursal
        );
    }

    public String insertarLlamadaAtencion(
            String idTecnico,
            String codEmpleado,
            Integer idUsuarioSupervisor,
            String idTipoComunicacion,
            String motivo,
            String descripcion,
            String comentarioColaborador,
            String acuerdos,
            String testigo,
            LocalDateTime fechaSeguimiento,
            String firmaTecnico,
            String firmaTestigo,
            Integer idSucursal,
            String sucursal,
            String tecnicoNombre) {
        List<Map<String, Object>> rows = tigohogarJdbcTemplate.queryForList(
                "EXEC dbo.spx_RegistrarLlamadaAtencion ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?",
                trimToNull(idTecnico),
                trimToNull(codEmpleado),
                idUsuarioSupervisor,
                trimToNull(idTipoComunicacion),
                trimToNull(motivo),
                trimToNull(descripcion),
                trimToNull(comentarioColaborador),
                trimToNull(acuerdos),
                trimToNull(testigo),
                fechaSeguimiento == null ? null : Timestamp.valueOf(fechaSeguimiento),
                trimToNull(firmaTecnico),
                trimToNull(firmaTestigo),
                idSucursal,
                trimToNull(sucursal),
                trimToNull(tecnicoNombre)
        );

        if (rows != null && !rows.isEmpty()) {
            Map<String, Object> row = rows.get(0);
            Object id = findValue(row, "idLlamadaAtencion", "Id_LlamadaAtencion", "id_llamadaatencion");
            if (id == null && !row.isEmpty()) {
                id = row.values().iterator().next();
            }
            if (id != null) {
                String text = String.valueOf(id).trim();
                if (!text.isEmpty()) {
                    return text;
                }
            }
        }

        throw new IllegalStateException("No se pudo obtener Id_LlamadaAtencion generado.");
    }

    private int resolveLimit(Integer limite) {
        if (limite == null || limite <= 0) {
            return 200;
        }
        return Math.min(limite, 1000);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Object findValue(Map<String, Object> row, String... keys) {
        if (row == null || row.isEmpty() || keys == null || keys.length == 0) {
            return null;
        }
        Map<String, Object> normalized = new HashMap<>();
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            normalized.put(normalize(entry.getKey()), entry.getValue());
        }
        for (String key : keys) {
            String normalizedKey = normalize(key);
            if (normalized.containsKey(normalizedKey)) {
                return normalized.get(normalizedKey);
            }
        }
        return null;
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("_", "").trim().toLowerCase(Locale.ROOT);
    }

}
