package com.example.TigoStarSystem.ot.service;

import com.example.TigoStarSystem.common.ApiException;
import com.example.TigoStarSystem.ot.dto.CuNoRealizadoCreateRequest;
import com.example.TigoStarSystem.ot.repository.CuNoRealizadoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CuNoRealizadoService {
    private final CuNoRealizadoRepository repository;

    /**
     * Inicializa el servicio de Cargo Usuario No Realizado.
     */
    public CuNoRealizadoService(CuNoRealizadoRepository repository) {
        this.repository = repository;
    }

    /**
     * Lista registros de CU no realizado.
     */
    public List<Map<String, Object>> listar() {
        return repository.listar();
    }

    /**
     * Obtiene un registro por id y valida existencia.
     */
    public Map<String, Object> obtenerPorId(Long id) {
        List<Map<String, Object>> rows = repository.obtenerPorId(id);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Cargo usuario no realizado no encontrado.");
        }
        return rows.get(0);
    }

    /**
     * Registra CU no realizado; actualmente retorna error si falta SP definitivo.
     */
    public void registrar(CuNoRealizadoCreateRequest request) {
        try {
            repository.registrarPlaceholder(request.getDatos());
        } catch (UnsupportedOperationException ex) {
            Map<String, Object> details = new HashMap<>();
            details.put("mensaje", ex.getMessage());
            details.put("datosRecibidos", request.getDatos());
            throw new ApiException(
                    HttpStatus.NOT_IMPLEMENTED,
                    "MISSING_STORED_PROCEDURE",
                    "Falta el SP para registrar Cargo Usuario No Realizado.",
                    details
            );
        }
    }
}
