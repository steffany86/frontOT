package com.example.TigoStarSystem.supervisor;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Normaliza nombres de sucursal a un formato canonico para evitar variantes.
 */
public final class SucursalCanonicalizer {
    private SucursalCanonicalizer() {
    }

    /**
     * Retorna una sucursal canonica cuando es reconocida; si no, devuelve el valor trim.
     */
    public static String canonicalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }

        String normalized = normalize(trimmed);
        if ("santacruz".equals(normalized)) {
            return "Santa_Cruz";
        }
        if ("sucre".equals(normalized)) {
            return "Sucre";
        }
        return trimmed;
    }

    private static String normalize(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        normalized = normalized.replaceAll("[\\s_\\-]+", "");
        return normalized.toLowerCase(Locale.ROOT);
    }
}
