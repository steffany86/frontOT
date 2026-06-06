package com.example.TigoStarSystem.auth.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.dao.DataAccessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@Repository
public class SucursalRepository {
    private static final Logger logger = LoggerFactory.getLogger(SucursalRepository.class);
    private static final String SP_SUCURSALES_WEB_DBO = "EXEC dbo.spx_ObtenerSucursalesConexionWeb";
    private static final String SP_SUCURSALES_WEB = "EXEC spx_ObtenerSucursalesConexionWeb";
    private final JdbcTemplate jdbcTemplate;

    public SucursalRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> obtenerSucursales() {
        try {
            return jdbcTemplate.queryForList(SP_SUCURSALES_WEB_DBO);
        } catch (DataAccessException ex) {
            if (!isMissingStoredProcedure(ex)) {
                logger.warn("Fallo al ejecutar {}.", SP_SUCURSALES_WEB_DBO, ex);
                throw ex;
            }
        }
        try {
            return jdbcTemplate.queryForList(SP_SUCURSALES_WEB);
        } catch (DataAccessException ex) {
            logger.warn("Fallo al ejecutar {}.", SP_SUCURSALES_WEB, ex);
            throw ex;
        }
    }

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
