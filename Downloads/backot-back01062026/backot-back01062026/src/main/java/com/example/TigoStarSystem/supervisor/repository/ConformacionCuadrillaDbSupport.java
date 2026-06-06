package com.example.TigoStarSystem.supervisor.repository;

import com.example.TigoStarSystem.auth.repository.SucursalRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

final class ConformacionCuadrillaDbSupport {
    private final SucursalRepository sucursalRepository;
    private final String dbUsername;
    private final String dbPassword;
    private final String dbDriver;
    private final String dbParams;

    ConformacionCuadrillaDbSupport(
            SucursalRepository sucursalRepository,
            String dbUsername,
            String dbPassword,
            String dbDriver,
            String mainDatasourceUrl,
            String centralDatasourceUrl,
            String sucreDatasourceUrl,
            String sucreDatabase,
            String sucreUsername,
            String sucrePassword,
            String dbParams) {
        this.sucursalRepository = sucursalRepository;
        this.dbUsername = dbUsername;
        this.dbPassword = dbPassword;
        this.dbDriver = dbDriver;
        this.dbParams = dbParams;
    }

    SucursalDbInfo resolverSucursalDbInfo(String sucursalParam) {
        List<Map<String, Object>> sucursales = sucursalRepository.obtenerSucursales();
        if (sucursales == null) {
            sucursales = new ArrayList<>();
        }

        Integer idBuscado = parseInteger(sucursalParam);
        String nombreBuscado = normalizeText(sucursalParam);
        Map<String, Object> sucursalMatch = null;

        for (Map<String, Object> row : sucursales) {
            Integer id = asInteger(firstNonNull(row, "idsucursal", "id_sucursal", "Id_Sucursal"));
            String nombre = asString(firstNonNull(row, "sucursal", "Sucursal"));
            boolean matchId = idBuscado != null && id != null && idBuscado.equals(id);
            boolean matchNombre = !nombreBuscado.isEmpty()
                    && !normalizeText(nombre).isEmpty()
                    && nombreBuscado.equals(normalizeText(nombre));
            if (matchId || matchNombre) {
                sucursalMatch = row;
                break;
            }
        }

        Integer idSucursal = asInteger(
                sucursalMatch == null ? null : firstNonNull(sucursalMatch, "idsucursal", "id_sucursal", "Id_Sucursal")
        );
        String nombreSucursalRaw = asString(
                sucursalMatch == null ? null : firstNonNull(sucursalMatch, "sucursal", "Sucursal")
        );
        String ip = asString(sucursalMatch == null ? null : firstNonNull(sucursalMatch, "ip", "IP"));
        String ip2 = asString(sucursalMatch == null ? null : firstNonNull(sucursalMatch, "ip2", "IP2"));
        String hostSucursal = firstNonBlank(ip, ip2);
        String baseSucursal = asString(
                sucursalMatch == null ? null : firstNonNull(sucursalMatch, "basededatos", "base_de_datos", "BaseDeDatos")
        );

        if (isBlank(hostSucursal) || isBlank(baseSucursal)) {
            return null;
        }

        return buildDbInfo(
                hostSucursal,
                baseSucursal,
                dbUsername,
                dbPassword,
                firstNonNull(idSucursal, idBuscado),
                firstNonBlank(nombreSucursalRaw, sucursalParam)
        );
    }

    Set<String> construirFiltrosConsulta(String sucursalParam, SucursalDbInfo dbInfo) {
        Set<String> filtros = new LinkedHashSet<>();
        if (isBlank(sucursalParam)) {
            filtros.add(null);
            return filtros;
        }

        addFiltro(filtros, sucursalParam);
        if (dbInfo != null) {
            addFiltro(filtros, dbInfo.getIdSucursal() == null ? null : String.valueOf(dbInfo.getIdSucursal()));
            addFiltro(filtros, dbInfo.getNombreSucursal());
        }
        return filtros;
    }

    JdbcTemplate crearJdbcTemplateSucursal(SucursalDbInfo dbInfo) {
        if (dbInfo == null) {
            return null;
        }
        return crearJdbcTemplateSucursal(
                dbInfo.getHost(),
                dbInfo.getBaseDeDatos(),
                dbInfo.getUsername(),
                dbInfo.getPassword()
        );
    }

    JdbcTemplate crearJdbcTemplateSucursal(String host, String baseDeDatos, String username, String password) {
        if (isBlank(host) || isBlank(baseDeDatos) || isBlank(username) || isBlank(password)) {
            return null;
        }
        String url;
        if (dbDriver != null && dbDriver.toLowerCase(Locale.ROOT).contains("jtds")) {
            url = "jdbc:jtds:sqlserver://" + host + "/" + baseDeDatos;
        } else {
            url = "jdbc:sqlserver://" + host + ";databaseName=" + baseDeDatos;
        }
        if (dbParams != null && !dbParams.trim().isEmpty()) {
            url = url + (dbParams.startsWith(";") ? dbParams : ";" + dbParams);
        }

        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName(dbDriver);
        dataSource.setUrl(url);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        return new JdbcTemplate(dataSource);
    }

    JdbcTemplate crearJdbcTemplateSucre() {
        return null;
    }

    boolean isSucre(String value) {
        return false;
    }

    boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    String normalizeText(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        normalized = normalized.replaceAll("[\\s_\\-]+", "");
        return normalized.trim().toLowerCase(Locale.ROOT);
    }

    Object firstNonNull(Map<String, Object> row, String... keys) {
        if (row == null || keys == null) {
            return null;
        }
        for (String key : keys) {
            if (row.containsKey(key) && row.get(key) != null) {
                return row.get(key);
            }
        }
        return null;
    }

    Integer asInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private Integer parseInteger(String value) {
        if (value == null) {
            return null;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private void addFiltro(Set<String> filtros, String value) {
        if (filtros == null || isBlank(value)) {
            return;
        }
        filtros.add(value.trim());
    }

    private SucursalDbInfo buildDbInfo(
            String host,
            String database,
            String username,
            String password,
            Integer idSucursal,
            String nombreSucursal) {
        if (isBlank(host) || isBlank(database) || isBlank(username) || isBlank(password)) {
            return null;
        }
        return new SucursalDbInfo(
                host.trim(),
                database.trim(),
                username.trim(),
                password.trim(),
                idSucursal,
                isBlank(nombreSucursal) ? null : nombreSucursal.trim()
        );
    }

    private Integer firstNonNull(Integer preferred, Integer fallback) {
        return preferred != null ? preferred : fallback;
    }

    private String firstNonBlank(String preferred, String fallback) {
        if (!isBlank(preferred)) {
            return preferred.trim();
        }
        return fallback;
    }

    static final class SucursalDbInfo {
        private final String host;
        private final String baseDeDatos;
        private final String username;
        private final String password;
        private final Integer idSucursal;
        private final String nombreSucursal;

        SucursalDbInfo(
                String host,
                String baseDeDatos,
                String username,
                String password,
                Integer idSucursal,
                String nombreSucursal) {
            this.host = host;
            this.baseDeDatos = baseDeDatos;
            this.username = username;
            this.password = password;
            this.idSucursal = idSucursal;
            this.nombreSucursal = nombreSucursal;
        }

        String getHost() {
            return host;
        }

        String getBaseDeDatos() {
            return baseDeDatos;
        }

        String getUsername() {
            return username;
        }

        String getPassword() {
            return password;
        }

        Integer getIdSucursal() {
            return idSucursal;
        }

        String getNombreSucursal() {
            return nombreSucursal;
        }
    }
}
