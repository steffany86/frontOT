package com.example.TigoStarSystem.auth.repository;

import com.example.TigoStarSystem.auth.dto.AuthLoginResponse;
import com.example.TigoStarSystem.auth.service.AuthSession;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

@Repository
public class AuthSessionRepository {
    private static final String SQL_CREATE_TABLE =
            "IF OBJECT_ID('dbo.tbl_auth_session', 'U') IS NULL " +
                    "BEGIN " +
                    "CREATE TABLE dbo.tbl_auth_session (" +
                    "token NVARCHAR(120) NOT NULL PRIMARY KEY, " +
                    "id_usuario INT NOT NULL, " +
                    "nombre NVARCHAR(200) NULL, " +
                    "rol NVARCHAR(120) NULL, " +
                    "id_rol INT NULL, " +
                    "id_sucursal INT NULL, " +
                    "expira DATETIME2 NOT NULL, " +
                    "fecha_registro DATETIME2 NOT NULL CONSTRAINT DF_tbl_auth_session_fecha_registro DEFAULT (GETDATE())" +
                    "); " +
                    "END;";

    private final JdbcTemplate jdbcTemplate;
    private volatile boolean initialized;

    public AuthSessionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void save(AuthSession session) {
        if (session == null || session.getToken() == null || session.getUsuario() == null || session.getExpira() == null) {
            return;
        }
        ensureTable();
        jdbcTemplate.update("DELETE FROM dbo.tbl_auth_session WHERE token = ?", session.getToken());
        jdbcTemplate.update(
                "INSERT INTO dbo.tbl_auth_session (token, id_usuario, nombre, rol, id_rol, id_sucursal, expira) VALUES (?, ?, ?, ?, ?, ?, ?)",
                session.getToken(),
                session.getUsuario().getIdUsuario(),
                session.getUsuario().getNombre(),
                session.getUsuario().getRol(),
                session.getUsuario().getIdRol(),
                session.getUsuario().getIdSucursal(),
                Timestamp.from(session.getExpira().toInstant())
        );
    }

    public AuthSession findByToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return null;
        }
        ensureTable();
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT TOP 1 token, id_usuario, nombre, rol, id_rol, id_sucursal, expira FROM dbo.tbl_auth_session WHERE token = ?",
                token
        );
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        Map<String, Object> row = rows.get(0);
        String tokenDb = asString(row.get("token"));
        Integer idUsuario = asInteger(row.get("id_usuario"));
        String nombre = asString(row.get("nombre"));
        String rol = asString(row.get("rol"));
        Integer idRol = asInteger(row.get("id_rol"));
        Integer idSucursal = asInteger(row.get("id_sucursal"));
        OffsetDateTime expira = asOffsetDateTime(row.get("expira"));
        if (tokenDb == null || idUsuario == null || expira == null) {
            return null;
        }
        AuthLoginResponse usuario = new AuthLoginResponse(idUsuario, nombre, rol, idRol, idSucursal);
        return new AuthSession(tokenDb, usuario, expira);
    }

    public void deleteByToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return;
        }
        ensureTable();
        jdbcTemplate.update("DELETE FROM dbo.tbl_auth_session WHERE token = ?", token);
    }

    public void deleteExpired() {
        ensureTable();
        jdbcTemplate.update("DELETE FROM dbo.tbl_auth_session WHERE expira < ?", Timestamp.from(Instant.now()));
    }

    private void ensureTable() {
        if (initialized) {
            return;
        }
        synchronized (this) {
            if (initialized) {
                return;
            }
            try {
                jdbcTemplate.execute(SQL_CREATE_TABLE);
            } catch (DataAccessException ignored) {
                // Si no se puede crear (permisos), intentamos operar sobre la tabla existente.
            }
            initialized = true;
        }
    }

    private Integer asInteger(Object value) {
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

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private OffsetDateTime asOffsetDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime) {
            return (OffsetDateTime) value;
        }
        if (value instanceof java.util.Date) {
            return OffsetDateTime.ofInstant(((java.util.Date) value).toInstant(), ZoneOffset.UTC);
        }
        if (value instanceof Timestamp) {
            return OffsetDateTime.ofInstant(((Timestamp) value).toInstant(), ZoneOffset.UTC);
        }
        try {
            return OffsetDateTime.parse(String.valueOf(value));
        } catch (RuntimeException ex) {
            return null;
        }
    }
}
