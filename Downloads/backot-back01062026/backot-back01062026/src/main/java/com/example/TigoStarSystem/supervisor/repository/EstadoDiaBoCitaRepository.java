package com.example.TigoStarSystem.supervisor.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Repository
public class EstadoDiaBoCitaRepository {
    private static final String SP_ULTIMO_ESTADO_DIA_BO_CITA_MAKIRO =
            "EXEC dbo.spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO ?, ?";

    private final JdbcTemplate centralJdbcTemplate;

    public EstadoDiaBoCitaRepository(@Qualifier("centralJdbcTemplate") JdbcTemplate centralJdbcTemplate) {
        this.centralJdbcTemplate = centralJdbcTemplate;
    }

    public List<Map<String, Object>> obtenerUltimoEstadoDia(LocalDate fecha, String tecnico) {
        return centralJdbcTemplate.queryForList(
                SP_ULTIMO_ESTADO_DIA_BO_CITA_MAKIRO,
                Date.valueOf(fecha),
                tecnico
        );
    }
}
