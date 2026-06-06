package com.example.TigoStarSystem.auth.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.dao.DataAccessException;

import java.util.Locale;

import java.util.List;
import java.util.Map;

@Repository
public class AuthRepository {


    private final JdbcTemplate jdbcTemplate;

    public AuthRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }



    public List<Map<String, Object>> validarUsuario(JdbcTemplate template, String usuario, String passwordHash) {
        if (template == null) {
            throw new IllegalArgumentException("JdbcTemplate requerido para validar usuario.");
        }
        try {
            return template.queryForList(
                    "EXEC dbo.spx_ValidarUsuario ?, ?",
                    usuario,
                    passwordHash
            );
        } catch (DataAccessException ex) {
            if (!isMissingStoredProcedure(ex)) {
                throw ex;
            }
            return template.queryForList(
                    "EXEC spx_ValidarUsuario ?, ?",
                    usuario,
                    passwordHash
            );
        }
    }



// Similar a validarUsuario, pero incluye el idSucursal para validación adicional.
    public List<Map<String, Object>> validarUsuarioSucursal(
            JdbcTemplate template,
            String usuario,
            String passwordHash,
            Integer idSucursal
    ) {
        if (template == null) {
            throw new IllegalArgumentException("JdbcTemplate requerido para validar usuario.");
        }
        try {
            return template.queryForList(
                    "EXEC dbo.spx_ValidarUsuarioSucursal ?, ?, ?",
                    usuario,
                    passwordHash,
                    idSucursal
            );
        } catch (DataAccessException ex) {
            if (!isMissingStoredProcedure(ex)) {
                throw ex;
            }
            return template.queryForList(
                    "EXEC spx_ValidarUsuarioSucursal ?, ?, ?",
                    usuario,
                    passwordHash,
                    idSucursal
            );
        }
    }

    public List<Map<String, Object>> cambiarPasswordUsuarioPorId(
            JdbcTemplate template,
            Integer idUsuario,
            String passwordHashActual,
            String passwordHashNueva
    ) {
        if (template == null) {
            throw new IllegalArgumentException("JdbcTemplate requerido para cambiar password.");
        }
        try {
            return template.queryForList(
                    "EXEC dbo.spx_CambiarPasswordUsuarioPorId ?, ?, ?",
                    idUsuario,
                    passwordHashActual,
                    passwordHashNueva
            );
        } catch (DataAccessException ex) {
            if (!isMissingStoredProcedure(ex)) {
                throw ex;
            }
            return template.queryForList(
                    "EXEC spx_CambiarPasswordUsuarioPorId ?, ?, ?",
                    idUsuario,
                    passwordHashActual,
                    passwordHashNueva
            );
        }
    }



//chequea si hay un error de procedimiento almacenado no encontrado, para evitar fallar si el SP tiene un nombre diferente (con o sin prefijo dbo.)
    private boolean isMissingStoredProcedure(DataAccessException ex) {
        Throwable root = ex;
        while (root.getCause() != null) {
            root = root.getCause();
        }
        if (root instanceof java.sql.SQLException) {
            java.sql.SQLException sqlEx = (java.sql.SQLException) root;
            if (sqlEx.getErrorCode() == 2812) {
                return true;
            }
            String msg = sqlEx.getMessage();
            if (msg != null) {
                String lower = msg.toLowerCase(Locale.ROOT);
                return lower.contains("procedimiento almacenado") && lower.contains("no se encontr");
            }
        }
        return false;
    }
}
