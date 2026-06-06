package com.example.TigoStarSystem.ot.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class CuNoRealizadoRepository {
    private final JdbcTemplate jdbcTemplate;

    public CuNoRealizadoRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }



    public List<Map<String, Object>> listar() {
        return jdbcTemplate.queryForList("EXEC spx_ObtenerCargoUsuarioNoRealizado_Listado");
    }




    public List<Map<String, Object>> obtenerPorId(Long codigo) {
        return jdbcTemplate.queryForList(
                "EXEC spx_ObtenerCargoUsuarioNoRealizado_ID ?",
                codigo
        );
    }
    

    

    public int registrarPlaceholder(Map<String, Object> datos) {
        // TODO: Falta el SP para registrar Cargo Usuario No Realizado.
        // Se requiere el nombre del procedimiento y la firma exacta.
        throw new UnsupportedOperationException("TODO: SP para registrar Cargo Usuario No Realizado no está definido.");
    }
}
