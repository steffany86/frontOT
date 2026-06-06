package com.example.TigoStarSystem.supervisor.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

final class TecnicoSearchUtil {
    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;

    /**
     * Utility class; evita instanciacion.
     */
    private TecnicoSearchUtil() {
    }

    /**
     * Filtra y ordena resultados de tecnicos por relevancia, aplicando limite.
     */
    static List<Map<String, Object>> filterAndLimit(List<Map<String, Object>> source, String query, Integer limit) {
        if (source == null || source.isEmpty()) {
            return Collections.emptyList();
        }
        int resolvedLimit = resolveLimit(limit);
        String term = normalize(query);

        if (term.isEmpty()) {
            return new ArrayList<>(source.subList(0, Math.min(resolvedLimit, source.size())));
        }

        List<Candidate> matches = new ArrayList<>();
        for (Map<String, Object> row : source) {
            String primary = normalize(firstValue(
                    row,
                    "tecnico",
                    "nombre"
            ));
            String secondary = normalize(firstValue(
                    row,
                    "cuenta_sf",
                    "cuentasf",
                    "salesforce",
                    "codempleado",
                    "id_vendedor",
                    "idtecnico",
                    "id_tecnico"
            ));

            int score = score(term, primary, secondary);
            if (score >= 0) {
                matches.add(new Candidate(row, score, primary));
            }
        }

        matches.sort(Comparator
                .comparingInt((Candidate c) -> c.score)
                .thenComparing(c -> c.sortKey)
        );

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < matches.size() && i < resolvedLimit; i++) {
            result.add(matches.get(i).row);
        }
        return result;
    }

    /**
     * Resuelve limite efectivo usando defaults y tope maximo.
     */
    private static int resolveLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }

    /**
     * Calcula puntaje de relevancia del termino contra campos primario/secundario.
     */
    private static int score(String term, String primary, String secondary) {
        if (primary.startsWith(term)) {
            return 0;
        }
        if (primary.contains(term)) {
            return 1;
        }
        if (secondary.startsWith(term)) {
            return 2;
        }
        if (secondary.contains(term)) {
            return 3;
        }
        return -1;
    }

    /**
     * Obtiene el primer valor encontrado entre claves candidatas.
     */
    private static String firstValue(Map<String, Object> row, String... candidates) {
        if (row == null || row.isEmpty()) {
            return "";
        }
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            String normalizedKey = normalizeKey(entry.getKey());
            for (String candidate : candidates) {
                if (normalizedKey.equals(normalizeKey(candidate))) {
                    return entry.getValue() == null ? "" : String.valueOf(entry.getValue());
                }
            }
        }
        return "";
    }

    /**
     * Normaliza clave de columna para comparacion case-insensitive.
     */
    private static String normalizeKey(String key) {
        if (key == null) {
            return "";
        }
        return key.replace("_", "").toLowerCase(Locale.ROOT);
    }

    /**
     * Normaliza texto para busqueda.
     */
    private static String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Contenedor interno con fila y metadatos de ordenamiento.
     */
    private static final class Candidate {
        private final Map<String, Object> row;
        private final int score;
        private final String sortKey;

        /**
         * Crea candidato para ranking de busqueda.
         */
        private Candidate(Map<String, Object> row, int score, String sortKey) {
            this.row = row;
            this.score = score;
            this.sortKey = sortKey;
        }
    }
}
