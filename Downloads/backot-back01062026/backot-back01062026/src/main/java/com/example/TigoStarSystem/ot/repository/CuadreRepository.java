package com.example.TigoStarSystem.ot.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Repository
public class CuadreRepository {
    private final JdbcTemplate jdbcTemplate;

    public CuadreRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> validarCuadreRuta(Integer idRuta, LocalDate fecha) {
        return jdbcTemplate.queryForList(
                "EXEC spx_ValidarCuadreRuta ?, ?",
                idRuta,
                Date.valueOf(fecha)
        );
    }
}
