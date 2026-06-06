package com.example.TigoStarSystem.ot.service;

import com.example.TigoStarSystem.ot.repository.ListaOtRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.LinkedHashSet;
import java.util.Set;

@Service
public class ListaOtService {
    private static final Logger logger = LoggerFactory.getLogger(ListaOtService.class);
    private final ListaOtRepository repository;

    public ListaOtService(ListaOtRepository repository) {
        this.repository = repository;
    }

    public List<Map<String, Object>> listar(
            LocalDate fecha,
            String tecnico,
            boolean tecnicoExacto,
            List<String> estadosSeleccionados,
            Integer idUsuario,
            Integer idSucursal) {
        List<Map<String, Object>> rowsSp = repository.listarPorFecha(fecha, tecnico, idSucursal, idUsuario);
        Set<String> agendaKeys = buildAgendaMatchKeys(rowsSp);
        // Importante:
        // No cambiar Origen en flujo de lectura/listado.
        // El listado debe ser solo consulta, sin efectos colaterales en BD.

        List<Integer> idsVendedor = repository.obtenerIdsVendedorPorIdUsuario(idUsuario, idSucursal);
        List<Map<String, Object>> rowsManual = repository.listarVentasManualPorFechaYVendedores(fecha, idsVendedor, idUsuario, idSucursal);
        rowsManual = filtrarManualesDuplicadosConAgenda(rowsManual, agendaKeys);
        List<Map<String, Object>> rows = appendRows(rowsManual, rowsSp);
        if (rows == null || rows.isEmpty()) {
            return rows;
        }

        String tecnicoNorm = normalizeText(tecnico);
        Set<String> estadosNorm = normalizeStates(estadosSeleccionados);
        boolean filtrarTecnico = tecnicoNorm != null && !tecnicoNorm.isEmpty();
        Set<Integer> idsVendedorNorm = normalizeIds(idsVendedor);
        boolean filtrarVendedor = !idsVendedorNorm.isEmpty();
        boolean filtrarUsuario = idUsuario != null && idUsuario > 0;
        boolean filtrarEstado = !estadosNorm.isEmpty();

        if (!filtrarTecnico && !filtrarVendedor && !filtrarEstado) {
            return rows;
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            if (filtrarUsuario) {
                boolean coincideUsuario = matchIdUsuario(row, idUsuario);
                boolean coincideVendedor = filtrarVendedor && matchIdVendedor(row, idsVendedorNorm);
                boolean coincideTecnico = filtrarTecnico && matchTecnico(row, tecnicoNorm, tecnicoExacto);
                if (!coincideUsuario && !coincideVendedor && !coincideTecnico) {
                    continue;
                }
            } else {
                boolean manualRow = isManualRow(row);
                boolean tieneTecnicoEnFila = hasTecnicoValue(row);
                if (filtrarTecnico && filtrarVendedor) {
                    boolean coincideTecnico = matchTecnico(row, tecnicoNorm, tecnicoExacto);
                    boolean coincideVendedor = matchIdVendedor(row, idsVendedorNorm);
                    if (manualRow) {
                        if (!coincideVendedor) {
                            continue;
                        }
                    } else if (!coincideTecnico && tieneTecnicoEnFila) {
                        continue;
                    }
                } else if (filtrarTecnico && !matchTecnico(row, tecnicoNorm, tecnicoExacto)) {
                    if (!manualRow && tieneTecnicoEnFila) {
                        continue;
                    }
                } else if (filtrarVendedor && !matchIdVendedor(row, idsVendedorNorm)) {
                    if (manualRow) {
                        continue;
                    }
                }
            }
            if (filtrarEstado && !matchEstado(row, estadosNorm)) {
                continue;
            }
            result.add(row);
        }
        // Fallback defensivo: algunos SP devuelven columnas/aliases distintos para tecnico
        // y el filtro posterior puede vaciar el listado aun cuando el SP retorno filas.
        if (result.isEmpty() && !filtrarUsuario && filtrarTecnico && tecnicoExacto && rowsSp != null && !rowsSp.isEmpty()) {
            return rowsSp;
        }
        return result;
    }

    private boolean matchTecnico(Map<String, Object> row, String tecnicoNorm, boolean exacto) {
        String tecnico = extractTecnicoNormalized(row);
        if (tecnico == null || tecnico.isEmpty()) {
            return false;
        }
        if (exacto) {
            return tecnico.equals(tecnicoNorm)
                    || tecnico.contains(tecnicoNorm)
                    || tecnicoNorm.contains(tecnico)
                    || matchTecnicoTokens(tecnico, tecnicoNorm);
        }
        return tecnico.contains(tecnicoNorm);
    }

    private boolean matchTecnicoTokens(String tecnicoRowNorm, String tecnicoFiltroNorm) {
        if (tecnicoRowNorm == null || tecnicoRowNorm.isEmpty() || tecnicoFiltroNorm == null || tecnicoFiltroNorm.isEmpty()) {
            return false;
        }
        Set<String> tokensRow = splitTokens(tecnicoRowNorm);
        Set<String> tokensFiltro = splitTokens(tecnicoFiltroNorm);
        if (tokensRow.isEmpty() || tokensFiltro.isEmpty()) {
            return false;
        }

        int overlap = 0;
        for (String token : tokensRow) {
            if (tokensFiltro.contains(token)) {
                overlap++;
            }
        }

        int minTokens = Math.min(tokensRow.size(), tokensFiltro.size());
        if (minTokens <= 0) {
            return false;
        }

        // Reglas de tolerancia:
        // - nombres cortos: al menos 2 tokens coincidentes
        // - nombres mas largos: al menos 3 tokens o 75% del menor conjunto
        if (minTokens <= 2) {
            return overlap >= 2;
        }
        int umbralPorcentaje = (int) Math.ceil(minTokens * 0.75);
        int umbral = Math.min(3, umbralPorcentaje);
        return overlap >= umbral;
    }

    private Set<String> splitTokens(String value) {
        Set<String> out = new LinkedHashSet<>();
        if (value == null || value.isEmpty()) {
            return out;
        }
        String[] parts = value.split("\\s+");
        for (String part : parts) {
            String token = part == null ? "" : part.trim();
            if (token.length() >= 2) {
                out.add(token);
            }
        }
        return out;
    }

    private boolean hasTecnicoValue(Map<String, Object> row) {
        String tecnico = extractTecnicoNormalized(row);
        return tecnico != null && !tecnico.isEmpty();
    }

    private String extractTecnicoNormalized(Map<String, Object> row) {
        return normalizeText(asString(findValue(row,
                "TECNICO", "tecnico",
                "tecnico_nombre", "tecniconombre",
                "nombrevendedor", "vendedor")));
    }

    private boolean matchEstado(Map<String, Object> row, Set<String> estadosNorm) {
        String cierre = normalizeText(asString(findValue(row, "CIERRE", "cierre")));
        String estado = normalizeText(asString(findValue(row, "ESTADO", "estado")));
        return (cierre != null && estadosNorm.contains(cierre))
                || (estado != null && estadosNorm.contains(estado));
    }

    private Set<String> normalizeStates(List<String> estados) {
        Set<String> out = new HashSet<>();
        if (estados == null || estados.isEmpty()) {
            return out;
        }
        for (String estado : estados) {
            String normalized = normalizeText(estado);
            if (normalized != null && !normalized.isEmpty()) {
                out.add(normalized);
            }
        }
        return out;
    }

    private Set<Integer> normalizeIds(List<Integer> ids) {
        Set<Integer> out = new HashSet<>();
        if (ids == null || ids.isEmpty()) {
            return out;
        }
        for (Integer id : ids) {
            if (id != null && id > 0) {
                out.add(id);
            }
        }
        return out;
    }

    private boolean matchIdVendedor(Map<String, Object> row, Set<Integer> idsVendedor) {
        Integer idVendedor = toPositiveInteger(findValue(row,
                "id_vendedor", "Id_Vendedor",
                "idVendedor", "IdVendedor",
                "id_tecnico", "Id_Tecnico",
                "idTecnico", "IdTecnico"));
        return idVendedor != null && idsVendedor.contains(idVendedor);
    }

    private boolean matchIdUsuario(Map<String, Object> row, Integer idUsuario) {
        if (idUsuario == null || idUsuario <= 0) {
            return false;
        }
        Integer idUsuarioRow = toPositiveInteger(findValue(row,
                "id_usuario", "Id_Usuario",
                "idUsuario", "IdUsuario",
                "idusuario", "Idusuario"));
        return idUsuarioRow != null && idUsuarioRow.equals(idUsuario);
    }

    private boolean isManualRow(Map<String, Object> row) {
        String origen = normalizeText(asString(findValue(row, "origen", "Origen")));
        return origen != null && origen.contains("manual");
    }

    private List<Map<String, Object>> appendRows(
            List<Map<String, Object>> rowsManual,
            List<Map<String, Object>> rowsSp) {
        List<Map<String, Object>> manual = rowsManual == null ? Collections.emptyList() : rowsManual;
        List<Map<String, Object>> sp = rowsSp == null ? Collections.emptyList() : rowsSp;
        if (manual.isEmpty() && sp.isEmpty()) {
            return Collections.emptyList();
        }
        List<Map<String, Object>> out = new ArrayList<>(manual.size() + sp.size());
        out.addAll(manual);
        out.addAll(sp);
        return out;
    }

    private Set<String> buildAgendaMatchKeys(List<Map<String, Object>> rowsSp) {
        Set<String> keys = new HashSet<>();
        if (rowsSp == null || rowsSp.isEmpty()) {
            return keys;
        }
        for (Map<String, Object> row : rowsSp) {
            Integer ordenTrabajo = toPositiveInteger(findValue(row,
                    "OT", "ot",
                    "ordenTrabajo", "OrdenTrabajo",
                    "orden_trabajo", "nroOT", "NroOT"));
            Integer codigoCliente = toPositiveInteger(findValue(row,
                    "codigoCliente", "CodigoCliente",
                    "cliente_nro", "Cliente_Nro",
                    "numeroCliente", "NumeroCliente",
                    "CODIGO", "Codigo", "codigo"));
            if (ordenTrabajo == null || codigoCliente == null) {
                continue;
            }
            keys.add(ordenTrabajo + "|" + codigoCliente);
        }
        return keys;
    }

    private List<Map<String, Object>> filtrarManualesDuplicadosConAgenda(
            List<Map<String, Object>> rowsManual,
            Set<String> agendaKeys) {
        if (rowsManual == null || rowsManual.isEmpty() || agendaKeys == null || agendaKeys.isEmpty()) {
            return rowsManual;
        }
        List<Map<String, Object>> filtrado = new ArrayList<>();
        for (Map<String, Object> row : rowsManual) {
            Integer ordenTrabajo = toPositiveInteger(findValue(row,
                    "OT", "ot",
                    "ordenTrabajo", "OrdenTrabajo",
                    "orden_trabajo", "nroOT", "NroOT",
                    "codigo", "Codigo"));
            Integer codigoCliente = toPositiveInteger(findValue(row,
                    "codigoCliente", "CodigoCliente",
                    "cliente_nro", "Cliente_Nro",
                    "numeroCliente", "NumeroCliente",
                    "CODIGO", "Codigo", "codigo"));
            if (ordenTrabajo == null || codigoCliente == null) {
                filtrado.add(row);
                continue;
            }
            String key = ordenTrabajo + "|" + codigoCliente;
            if (!agendaKeys.contains(key)) {
                filtrado.add(row);
            }
        }
        return filtrado;
    }

    private List<Long> collectManualSaleIdsToPromote(
            List<Map<String, Object>> rowsManual,
            Set<String> agendaKeys) {
        List<Long> ids = new ArrayList<>();
        if (rowsManual == null || rowsManual.isEmpty() || agendaKeys == null || agendaKeys.isEmpty()) {
            return ids;
        }
        for (Map<String, Object> row : rowsManual) {
            Integer ordenTrabajo = toPositiveInteger(findValue(row,
                    "OT", "ot",
                    "ordenTrabajo", "OrdenTrabajo",
                    "orden_trabajo", "nroOT", "NroOT",
                    "codigo", "Codigo"));
            Integer codigoCliente = toPositiveInteger(findValue(row,
                    "codigoCliente", "CodigoCliente",
                    "cliente_nro", "Cliente_Nro",
                    "numeroCliente", "NumeroCliente",
                    "CODIGO", "Codigo", "codigo"));
            if (ordenTrabajo == null || codigoCliente == null) {
                continue;
            }
            String key = ordenTrabajo + "|" + codigoCliente;
            if (!agendaKeys.contains(key)) {
                continue;
            }
            Long idVenta = toPositiveLong(findValue(row, "idVenta", "Id_Venta", "id_venta", "id", "Id"));
            if (idVenta != null && !ids.contains(idVenta)) {
                ids.add(idVenta);
            }
        }
        return ids;
    }

    private Integer toPositiveInteger(Object value) {
        if (value == null) {
            return null;
        }
        try {
            Integer parsed = value instanceof Number
                    ? ((Number) value).intValue()
                    : Integer.parseInt(String.valueOf(value).trim());
            return parsed > 0 ? parsed : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Long toPositiveLong(Object value) {
        if (value == null) {
            return null;
        }
        try {
            Long parsed = value instanceof Number
                    ? ((Number) value).longValue()
                    : Long.parseLong(String.valueOf(value).trim());
            return parsed > 0 ? parsed : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Object findValue(Map<String, Object> row, String... candidates) {
        if (row == null || row.isEmpty() || candidates == null || candidates.length == 0) {
            return null;
        }
        Map<String, Object> normalized = new HashMap<>();
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            normalized.put(normalizeKey(entry.getKey()), entry.getValue());
        }
        for (String candidate : candidates) {
            String key = normalizeKey(candidate);
            if (normalized.containsKey(key)) {
                return normalized.get(key);
            }
        }
        return null;
    }

    private String normalizeKey(String key) {
        if (key == null) {
            return "";
        }
        return key.replace("_", "")
                .replace("-", "")
                .replace(" ", "")
                .toLowerCase(Locale.ROOT);
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        normalized = normalized
                .replaceAll("[^\\p{IsAlphabetic}\\p{IsDigit}]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return normalized.toLowerCase(Locale.ROOT);
    }

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }
}
