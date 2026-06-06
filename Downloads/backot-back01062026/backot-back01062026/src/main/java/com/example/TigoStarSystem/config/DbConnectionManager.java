package com.example.TigoStarSystem.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class DbConnectionManager {
    private final JdbcTemplate operativaJdbcTemplate;
    private final JdbcTemplate centralJdbcTemplate;
    private final String dbDriver;
    private final String dbParams;
    private final String sucreUrl;
    private final String sucreUsername;
    private final String sucrePassword;
    private volatile JdbcTemplate sucreJdbcTemplate;
    private final Map<String, JdbcTemplate> dynamicJdbcTemplates = new ConcurrentHashMap<>();

    public DbConnectionManager(
            JdbcTemplate operativaJdbcTemplate,
            @Qualifier("centralJdbcTemplate") JdbcTemplate centralJdbcTemplate,
            @Value("${spring.datasource.driver-class-name}") String dbDriver,
            @Value("${app.datasource.params:encrypt=false;trustServerCertificate=true}") String dbParams,
            @Value("${app.sucre.datasource.url:}") String sucreUrl,
            @Value("${app.sucre.datasource.username:${spring.datasource.username}}") String sucreUsername,
            @Value("${app.sucre.datasource.password:${spring.datasource.password}}") String sucrePassword) {
        this.operativaJdbcTemplate = operativaJdbcTemplate;
        this.centralJdbcTemplate = centralJdbcTemplate;
        this.dbDriver = dbDriver;
        this.dbParams = dbParams;
        this.sucreUrl = sucreUrl;
        this.sucreUsername = sucreUsername;
        this.sucrePassword = sucrePassword;
    }

    public JdbcTemplate connDb(String nombreDb) {
        String key = normalize(nombreDb);
        if ("operativa".equals(key) || "default".equals(key) || "principal".equals(key)) {
            return requireTemplate(operativaJdbcTemplate, "operativa");
        }
        if ("central".equals(key) || "bdcontrolordenes".equals(key)) {
            return requireTemplate(centralJdbcTemplate, "central");
        }
        if ("sucre".equals(key) || "sucreprueba".equals(key)) {
            return connDbSucre();
        }
        throw new IllegalArgumentException("Base de datos no registrada: " + nombreDb);
    }

    public JdbcTemplate connDb(String nombreDb, String host, String baseDeDatos, String username, String password) {
        if (isBlank(host) || isBlank(baseDeDatos)) {
            throw new IllegalArgumentException(
                    "ConnDb(" + nombreDb + ") requiere host y baseDeDatos."
            );
        }
        return connDb(nombreDb, construirUrl(host.trim(), baseDeDatos.trim()), username, password);
    }

    public JdbcTemplate connDb(String nombreDb, String jdbcUrl, String username, String password) {
        if (isBlank(jdbcUrl)) {
            throw new IllegalArgumentException("ConnDb(" + nombreDb + ") requiere jdbcUrl.");
        }
        if (isBlank(username) || isBlank(password)) {
            throw new IllegalArgumentException(
                    "ConnDb(" + nombreDb + ") requiere username y password."
            );
        }
        String normalizedUrl = jdbcUrl.trim();
        String normalizedUsername = username.trim();
        String normalizedPassword = password.trim();
        String poolKey = safePoolKey(nombreDb);
        String cacheKey = normalize(poolKey) + "|" + normalizeJdbcUrlForCache(normalizedUrl) + "|" + normalizedUsername.toLowerCase(Locale.ROOT);
        return dynamicJdbcTemplates.computeIfAbsent(
                cacheKey,
                key -> crearJdbcTemplate(
                        normalizedUrl,
                        normalizedUsername,
                        normalizedPassword,
                        "ConnDb-" + poolKey
                )
        );
    }

    private JdbcTemplate connDbSucre() {
        JdbcTemplate cached = sucreJdbcTemplate;
        if (cached != null) {
            return cached;
        }
        synchronized (this) {
            if (sucreJdbcTemplate != null) {
                return sucreJdbcTemplate;
            }
            if (isBlank(sucreUrl)) {
                throw new IllegalStateException("No existe configuracion app.sucre.datasource.url.");
            }
            if (isBlank(sucreUsername) || isBlank(sucrePassword)) {
                throw new IllegalStateException("Credenciales de Sucre incompletas.");
            }
            sucreJdbcTemplate = crearJdbcTemplate(
                    sucreUrl.trim(),
                    sucreUsername.trim(),
                    sucrePassword.trim(),
                    "ConnDb-Sucre"
            );
            return sucreJdbcTemplate;
        }
    }

    private JdbcTemplate requireTemplate(JdbcTemplate template, String nombre) {
        if (template == null) {
            throw new IllegalStateException("No existe JdbcTemplate configurado para " + nombre + ".");
        }
        return template;
    }

    private JdbcTemplate crearJdbcTemplate(String jdbcUrl, String username, String password, String poolName) {
        HikariConfig config = new HikariConfig();
        config.setPoolName(poolName);
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName(dbDriver);
        config.setConnectionTestQuery("SELECT 1");
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(0);
        config.setInitializationFailTimeout(-1);
        return new JdbcTemplate(new HikariDataSource(config));
    }

    private String construirUrl(String host, String baseDeDatos) {
        String url;
        if (dbDriver != null && dbDriver.toLowerCase(Locale.ROOT).contains("jtds")) {
            url = "jdbc:jtds:sqlserver://" + host + "/" + baseDeDatos;
        } else {
            url = "jdbc:sqlserver://" + host + ";databaseName=" + baseDeDatos;
        }
        if (!isBlank(dbParams)) {
            url = url + (dbParams.startsWith(";") ? dbParams : ";" + dbParams);
        }
        return url;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String safePoolKey(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "Custom";
        }
        return value.trim().replaceAll("[^A-Za-z0-9_\\-]", "_");
    }

    private String normalizeJdbcUrlForCache(String jdbcUrl) {
        return jdbcUrl == null ? "" : jdbcUrl.trim().toLowerCase(Locale.ROOT);
    }
}
