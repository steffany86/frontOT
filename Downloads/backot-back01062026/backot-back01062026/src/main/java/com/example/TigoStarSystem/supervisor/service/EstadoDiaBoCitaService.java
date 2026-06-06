package com.example.TigoStarSystem.supervisor.service;

import com.example.TigoStarSystem.auth.dto.AuthMeResponse;
import com.example.TigoStarSystem.auth.service.AuthService;
import com.example.TigoStarSystem.common.ApiException;
import com.example.TigoStarSystem.supervisor.repository.EstadoDiaBoCitaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class EstadoDiaBoCitaService {
    private final EstadoDiaBoCitaRepository repository;
    private final AuthService authService;

    public EstadoDiaBoCitaService(EstadoDiaBoCitaRepository repository, AuthService authService) {
        this.repository = repository;
        this.authService = authService;
    }

    public List<Map<String, Object>> consultarUltimoEstadoDia(LocalDate fecha, String tecnico, String token) {
        String tecnicoResuelto = resolveTecnico(tecnico, token);
        LocalDate fechaConsulta = fecha == null ? LocalDate.now() : fecha;
        return repository.obtenerUltimoEstadoDia(fechaConsulta, tecnicoResuelto);
    }

    private String resolveTecnico(String tecnico, String token) {
        String tecnicoParam = trimToNull(tecnico);
        if (tecnicoParam != null) {
            return tecnicoParam;
        }
        if (trimToNull(token) == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "Debes enviar el parametro tecnico o un X-Session-Token valido."
            );
        }
        AuthMeResponse me = authService.me(token);
        String tecnicoSesion = me == null || me.getUsuario() == null
                ? null
                : trimToNull(me.getUsuario().getNombre());
        if (tecnicoSesion == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "No se pudo resolver el tecnico desde la sesion."
            );
        }
        return tecnicoSesion;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
