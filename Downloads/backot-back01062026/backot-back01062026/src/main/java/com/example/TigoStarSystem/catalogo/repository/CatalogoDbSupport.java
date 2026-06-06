package com.example.TigoStarSystem.catalogo.repository;

import com.example.TigoStarSystem.auth.repository.SucursalRepository;
import com.example.TigoStarSystem.common.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

final class CatalogoDbSupport {
    private static final Logger logger = LoggerFactory.getLogger(CatalogoDbSupport.class);
    private final SucursalRepository sucursalRepository;
    private final String dbDriver;
    private final String dbParams;
    private final String dbUsername;
    private final String dbPassword;
    private final Map<Integer, JdbcTemplate> templatesBySucursal = new LinkedHashMap<>();

    CatalogoDbSupport(
            SucursalRepository sucursalRepository,
            String dbDriver,
            String mainDatasourceUrl,
            String sucreDatasourceUrl,
            String sucreDatabase,
            String sucreUsername,
            String sucrePassword,
            String dbParams
    ) {
        this.sucursalRepository = sucursalRepository;
        this.dbDriver = dbDriver;
        this.dbParams = dbParams;
        this.dbUsername = firstNonBlank(sucreUsername, "sistemas");
        this.dbPassword = firstNonBlank(sucrePassword, "sametsis");
    }

    JdbcTemplate resolveTemplate(Integer idSucursal, JdbcTemplate defaultJdbcTemplate) {
        if (idSucursal == null) {
            return defaultJdbcTemplate;
        }
        SucursalDbInfo info = resolverSucursalDbInfo(idSucursal);
        if (info == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "SUCURSAL_DB_NOT_RESOLVED",
                    "No se pudo resolver la conexion de la sucursal seleccionada."
            );
        }
        synchronized (templatesBySucursal) {
            JdbcTemplate template = templatesBySucursal.get(idSucursal);
            if (template != null) {
                logger.debug("Catalogo DB cache hit idSucursal={} host={} db={}", idSucursal, info.host, info.baseDeDatos);
                return template;
            }
            logger.info("Catalogo DB resolve idSucursal={} host={} db={}", idSucursal, info.host, info.baseDeDatos);
            template = crearJdbcTemplate(info.host, info.baseDeDatos, dbUsername, dbPassword);
            templatesBySucursal.put(idSucursal, template);
            return template;
        }
    }

    private JdbcTemplate crearJdbcTemplate(String host, String database, String username, String password) {
        if (isBlank(host) || isBlank(database) || isBlank(username) || isBlank(password)) {
            return null;
        }

        String url;
        if (dbDriver != null && dbDriver.toLowerCase(Locale.ROOT).contains("jtds")) {
            url = "jdbc:jtds:sqlserver://" + host + "/" + database;
        } else {
            url = "jdbc:sqlserver://" + host + ";databaseName=" + database;
        }
        if (!isBlank(dbParams)) {
            url = url + (dbParams.startsWith(";") ? dbParams : ";" + dbParams);
        }

        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName(dbDriver);
        dataSource.setUrl(url);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        return new JdbcTemplate(dataSource);
    }

    private SucursalDbInfo resolverSucursalDbInfo(Integer idSucursal) {
        List<Map<String, Object>> rows = sucursalRepository.obtenerSucursales();
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        for (Map<String, Object> row : rows) {
            Integer id = asInteger(firstNonNull(row, "idsucursal", "id_sucursal", "Id_Sucursal"));
            if (id == null || !id.equals(idSucursal)) {
                continue;
            }
            String ip = asString(firstNonNull(row, "ip", "IP"));
            String ip2 = asString(firstNonNull(row, "ip2", "IP2"));
            String host = firstNonBlank(ip, ip2);
            String baseDeDatos = asString(firstNonNull(row, "basededatos", "base_de_datos", "BaseDeDatos"));
            if (isBlank(host) || isBlank(baseDeDatos)) {
                return null;
            }
            return new SucursalDbInfo(host.trim(), baseDeDatos.trim());
        }
        return null;
    }

    private Object firstNonNull(Map<String, Object> row, String... keys) {
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

    private Integer asInteger(Object value) {
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

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String firstNonBlank(String preferred, String fallback) {
        if (!isBlank(preferred)) {
            return preferred.trim();
        }
        return fallback;
    }

    private static final class SucursalDbInfo {
        private final String host;
        private final String baseDeDatos;

        private SucursalDbInfo(String host, String baseDeDatos) {
            this.host = host;
            this.baseDeDatos = baseDeDatos;
        }
    }
}
