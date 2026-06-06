package com.example.TigoStarSystem.supervisor.service;

import com.example.TigoStarSystem.auth.dto.AuthMeResponse;
import com.example.TigoStarSystem.auth.dto.SucursalResponse;
import com.example.TigoStarSystem.auth.service.AuthService;
import com.example.TigoStarSystem.common.ApiException;
import com.example.TigoStarSystem.supervisor.SucursalCanonicalizer;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaRowRequest;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaWebRequest;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaWebResponse;
import com.example.TigoStarSystem.supervisor.repository.ConformacionCuadrillaRepository;
import com.example.TigoStarSystem.supervisor.repository.ConformacionCuadrillaWebRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ConformacionCuadrillaWebService {
    private final ConformacionCuadrillaWebRepository repository;
    private final ConformacionCuadrillaRepository backofficeRepository;
    private final ConformacionCuadrillaMailService mailService;
    private final ConformacionCuadrillaRequestValidator validator;
    private final AuthService authService;
    private final ConformacionCuadrillaRowMapper rowMapper;

    /**
     * Inicializa el servicio web de conformacion de cuadrilla.
     */
    public ConformacionCuadrillaWebService(
            ConformacionCuadrillaWebRepository repository,
            ConformacionCuadrillaRepository backofficeRepository,
            ConformacionCuadrillaMailService mailService,
            AuthService authService) {
        this.repository = repository;
        this.backofficeRepository = backofficeRepository;
        this.mailService = mailService;
        this.authService = authService;
        this.validator = new ConformacionCuadrillaRequestValidator();
        this.rowMapper = new ConformacionCuadrillaRowMapper();
    }

    /**
     * Lista conformaciones web filtrando por fecha/sucursal y limite.
     */
    public List<ConformacionCuadrillaWebResponse> listar(
            LocalDate fecha,
            String sucursal,
            Integer limite,
            String token) {
        if (limite != null && limite < 0) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "limite no puede ser negativo."
            );
        }
        String sucursalResuelta = resolveSucursalNombre(sucursal, token);
        List<Map<String, Object>> rows = backofficeRepository.listarGruposFiltroEdicion(sucursalResuelta);
        List<ConformacionCuadrillaWebResponse> out = new ArrayList<>();
        if (rows == null || rows.isEmpty()) {
            return out;
        }

        LocalDate fechaSalida = fecha == null ? LocalDate.now() : fecha;
        Map<Integer, Map<String, Object>> relacionesByRuta = indexRelacionesByRuta(sucursalResuelta);
        Map<Integer, Map<String, Object>> tecnicoDetalleCache = new java.util.HashMap<>();
        for (Map<String, Object> row : rows) {
            ConformacionCuadrillaWebResponse mapped = mapRutaRowToWebResponse(row, sucursalResuelta, fechaSalida);
            completarRelacionRuta(mapped, relacionesByRuta);
            completarTecnicoFaltante(mapped, sucursalResuelta, tecnicoDetalleCache);
            out.add(mapped);
        }
        if (limite == null || limite <= 0 || out.size() <= limite) {
            return out;
        }
        return new ArrayList<>(out.subList(0, limite));
    }

    /**
     * Obtiene el detalle de una conformacion web por id.
     */
    public ConformacionCuadrillaWebResponse obtenerPorId(Long id, String sucursal, String token) {
        validarId(id);
        String sucursalResuelta = resolveSucursalNombre(sucursal, token);
        ConformacionCuadrillaWebResponse row = repository.obtenerPorId(id, sucursalResuelta);
        if (row == null) {
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    "NOT_FOUND",
                    "Registro de conformacion cuadrilla web no encontrado."
            );
        }
        return row;
    }

    /**
     * Crea una conformacion web, valida datos y envia correo de seguimiento.
     */
    public ConformacionCuadrillaWebResponse crear(ConformacionCuadrillaWebRequest request, String token) {
        completarContextoSesion(request, token);
        validator.validarWeb(request);
        validarAuxiliarNoPuedeSerTecnicoActivo(
                request.getIdTecnicoAuxiliar(),
                request.getIdTecnico(),
                request.getFecha(),
                request.getSucursal(),
                null
        );
        validarTecnicoNoDuplicado(
                request.getTecnico(),
                request.getFecha(),
                request.getSucursal(),
                null,
                "Registro"
        );
        Long id = repository.crear(request);
        if (id == null) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "INSERT_FAILED",
                    "No se pudo registrar la conformacion cuadrilla web."
            );
        }

        enviarCorreo(request);
        ConformacionCuadrillaWebResponse persisted = repository.obtenerPorId(id, request.getSucursal());
        return persisted == null ? repository.obtenerPorIdPersistido(id) : persisted;
    }

    /**
     * Actualiza una conformacion; si no existe intenta fallback y luego upsert.
     */
    public ConformacionCuadrillaWebResponse actualizar(Long id, ConformacionCuadrillaWebRequest request, String token) {
        validarId(id);
        completarContextoSesion(request, token);
        validator.validarWeb(request);
        validarAuxiliarNoPuedeSerTecnicoActivo(
                request.getIdTecnicoAuxiliar(),
                request.getIdTecnico(),
                request.getFecha(),
                request.getSucursal(),
                id
        );
        validarTecnicoNoDuplicado(
                request.getTecnico(),
                request.getFecha(),
                request.getSucursal(),
                id,
                "Registro"
        );
        int affected = repository.actualizar(id, request);
        if (affected == 0) {
            int affectedBackoffice = backofficeRepository.actualizarFila(id, mapToBackOfficeRow(request));
            if (affectedBackoffice > 0) {
                enviarCorreo(request);
                ConformacionCuadrillaWebResponse byRoute = repository.obtenerPorId(id, request.getSucursal());
                if (byRoute != null) {
                    return byRoute;
                }
                return construirRespuestaDesdeRequest(id, request);
            }

            Long nuevoId = repository.crear(request);
            if (nuevoId == null) {
                throw new ApiException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "UPSERT_FAILED",
                        "No se pudo actualizar ni registrar la conformacion cuadrilla web."
                );
            }
            enviarCorreo(request);
            ConformacionCuadrillaWebResponse byRoute = repository.obtenerPorId(id, request.getSucursal());
            if (byRoute != null) {
                return byRoute;
            }
            ConformacionCuadrillaWebResponse bySavedId = repository.obtenerPorIdPersistido(nuevoId);
            if (bySavedId != null) {
                return bySavedId;
            }
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "UPSERT_READ_FAILED",
                    "Conformacion cuadrilla web guardada, pero no se pudo recuperar el registro."
            );
        }
        enviarCorreo(request);
        ConformacionCuadrillaWebResponse persisted = repository.obtenerPorId(id, request.getSucursal());
        return persisted == null ? repository.obtenerPorIdPersistido(id) : persisted;
    }

    /**
     * Construye respuesta minima con datos del request cuando no se pudo releer de BD.
     */
    private ConformacionCuadrillaWebResponse construirRespuestaDesdeRequest(Long id, ConformacionCuadrillaWebRequest request) {
        ConformacionCuadrillaWebResponse out = new ConformacionCuadrillaWebResponse();
        out.setId(id);
        out.setFecha(request.getFecha());
        out.setEstado(request.getEstado());
        out.setActividad(request.getActividad());
        out.setIdTecnico(request.getIdTecnico());
        out.setCuentaSf(request.getCuentaSf());
        out.setSalesforce(request.getSalesforce());
        out.setHabilidad(request.getHabilidad());
        out.setVehiculo(request.getVehiculo());
        out.setGrupo(request.getGrupo());
        out.setAlmacen(request.getAlmacen());
        out.setGrupoDigitacion(request.getGrupoDigitacion());
        out.setIdUsuarioDigitador(request.getIdUsuarioDigitador());
        out.setDigitador(request.getDigitador());
        out.setTecnico(request.getTecnico());
        out.setIdTecnicoAuxiliar(request.getIdTecnicoAuxiliar());
        out.setAuxiliar(request.getAuxiliar());
        out.setIdUsuarioSupervisor(request.getIdUsuarioSupervisor());
        out.setSupervisorACargo(request.getSupervisorACargo());
        out.setSucursal(request.getSucursal());
        out.setObservacion(request.getObservacion());
        out.setIdUsuarioRegistra(request.getIdUsuarioRegistra());
        out.setEEliminado(false);
        return out;
    }

    /**
     * Elimina (logico/fisico segun SP) una conformacion web por id.
     */
    public int eliminar(Long id) {
        validarId(id);
        int affected = repository.eliminar(id);
        if (affected == 0) {
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    "NOT_FOUND",
                    "Registro de conformacion cuadrilla web no encontrado."
            );
        }
        return affected;
    }

    /**
     * Lista tecnicos para el formulario web aplicando busqueda y limite.
     */
    public List<Map<String, Object>> listarTecnicos(String q, Integer limit, String sucursal, String token) {
        String sucursalResuelta = resolveSucursalNombre(sucursal, token);
        return TecnicoSearchUtil.filterAndLimit(repository.listarTecnicos(sucursalResuelta), q, limit);
    }

    /**
     * Obtiene detalle de tecnico para autocompletado/formulario web.
     */
    public List<Map<String, Object>> obtenerTecnicoDetalle(Integer idTecnico, String sucursal, String token) {
        if (idTecnico == null || idTecnico <= 0) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "idTecnico es requerido."
            );
        }
        String sucursalResuelta = resolveSucursalNombre(sucursal, token);
        return repository.obtenerTecnicoDetalle(idTecnico, sucursalResuelta);
    }

    /**
     * Lista auxiliares disponibles en la sucursal resuelta.
     */
    public List<Map<String, Object>> listarAuxiliares(String sucursal, String token) {
        return repository.listarAuxiliares(resolveSucursalNombre(sucursal, token));
    }

    /**
     * Lista digitadores disponibles en la sucursal resuelta.
     */
    public List<Map<String, Object>> listarDigitadores(String sucursal, String token) {
        return repository.listarDigitadores(resolveSucursalNombre(sucursal, token));
    }

    /**
     * Lista supervisores disponibles en la sucursal resuelta.
     */
    public List<Map<String, Object>> listarSupervisores(String sucursal, String token) {
        return repository.listarSupervisores(resolveSucursalNombre(sucursal, token));
    }

    /**
     * Lista catalogo Salesforce/Cuenta SF desde tbl_SalesForce segun sucursal resuelta.
     */
    public List<Map<String, Object>> listarSalesforce(String q, Integer limit, String sucursal, String token) {
        String sucursalResuelta = resolveSucursalNombre(sucursal, token);
        List<Map<String, Object>> items = rowMapper.deduplicarPorPrimerCampoNoNulo(
                backofficeRepository.listarSalesforce(sucursalResuelta),
                "salesforce",
                "SalesForce"
        );
        return rowMapper.filtrarPorTextoYLimite(
                items,
                q,
                limit,
                "salesforce",
                "cuenta_sf",
                "cuentasf",
                "cuentaSf"
        );
    }

    /**
     * Lista actividades disponibles en la sucursal resuelta.
     */
    public List<Map<String, Object>> listarActividades(String sucursal, String token) {
        return repository.listarActividades(resolveSucursalNombre(sucursal, token));
    }

    /**
     * Lista vehiculos por filtro textual en la sucursal resuelta.
     */
    public List<Map<String, Object>> listarVehiculos(String filtro, String sucursal, String token) {
        return repository.listarVehiculos(resolveSucursalNombre(sucursal, token), filtro);
    }

    /**
     * Lista sucursales visibles para el flujo web.
     */
    public List<Map<String, Object>> listarSucursales(String sucursal, String token) {
        return repository.listarSucursales(resolveSucursalNombre(sucursal, token));
    }

    /**
     * Valida que un id sea positivo y no nulo.
     */
    private void validarId(Long id) {
        if (id == null || id <= 0) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "id es requerido."
            );
        }
    }

    /**
     * Envia correo con cuadrillas no confirmadas usando contexto del request.
     */
    private void enviarCorreo(ConformacionCuadrillaWebRequest request) {
        List<ConformacionCuadrillaRowRequest> confirmadas = new ArrayList<>();
        confirmadas.add(mapToBackOfficeRow(request));
        mailService.enviarDetalleCuadrillasNoConfirmadas(
                backofficeRepository.listarGruposFiltroEdicion(request.getSucursal()),
                confirmadas
        );
    }

    /**
     * Convierte request web al modelo row usado por backoffice.
     */
    private ConformacionCuadrillaRowRequest mapToBackOfficeRow(ConformacionCuadrillaWebRequest in) {
        ConformacionCuadrillaRowRequest out = new ConformacionCuadrillaRowRequest();
        out.setFecha(in.getFecha());
        out.setEstado(in.getEstado());
        out.setActividad(in.getActividad());
        out.setIdTecnico(in.getIdTecnico());
        out.setCuentaSf(in.getCuentaSf());
        out.setSalesforce(in.getSalesforce());
        out.setHabilidad(in.getHabilidad());
        out.setVehiculo(in.getVehiculo());
        out.setGrupo(in.getGrupo());
        out.setAlmacen(in.getAlmacen());
        out.setGrupoDigitacion(in.getGrupoDigitacion());
        out.setIdUsuarioDigitador(in.getIdUsuarioDigitador());
        out.setDigitador(in.getDigitador());
        out.setTecnico(in.getTecnico());
        out.setIdTecnicoAuxiliar(in.getIdTecnicoAuxiliar());
        out.setAuxiliar(in.getAuxiliar());
        out.setIdUsuarioSupervisor(in.getIdUsuarioSupervisor());
        out.setSupervisorACargo(in.getSupervisorACargo());
        out.setSucursal(SucursalCanonicalizer.canonicalize(in.getSucursal()));
        out.setObservacion(in.getObservacion());
        out.setIdUsuarioRegistra(in.getIdUsuarioRegistra());
        return out;
    }

    /**
     * Completa sucursal desde sesion cuando no llega en el request.
     */
    private void completarContextoSesion(ConformacionCuadrillaWebRequest request, String token) {
        if (request == null) {
            return;
        }
        if (isBlank(request.getSucursal())) {
            request.setSucursal(resolveSucursalNombre(null, token));
        }
    }

    /**
     * Mapea una fila del SP de rutas al DTO web usado por el front.
     */
    private ConformacionCuadrillaWebResponse mapRutaRowToWebResponse(
            Map<String, Object> row,
            String sucursal,
            LocalDate fecha) {
        ConformacionCuadrillaWebResponse out = new ConformacionCuadrillaWebResponse();
        out.setId(toLong(readValue(row, "id", "id_ruta", "idruta", "Id_Ruta")));
        out.setFecha(fecha);
        out.setActividad(resolverActividadDesdeRuta(row));
        out.setIdTecnico(toInteger(readValue(row, "id_tecnico", "idtecnico", "id_vendedor", "Id_Vendedor")));
        out.setTecnico(toString(readValue(row, "tecnico", "nombrevendedor", "vendedor", "nombre")));
        out.setGrupo(toString(readValue(row, "grupo", "cuadrilla", "ruta", "nombre", "Nombre")));
        out.setVehiculo(toString(readValue(row, "vehiculo", "Vehiculo", "placa", "placaVehiculo")));
        out.setAlmacen(toString(readValue(row, "almacen", "almacen_tigo", "almacenTigo", "BodegaTigo")));
        out.setGrupoDigitacion(toString(readValue(row, "grupoDigitacion", "grupodigitacion")));
        out.setSucursal(SucursalCanonicalizer.canonicalize(
                isBlank(sucursal) ? toString(readValue(row, "sucursal", "Sucursal")) : sucursal
        ));
        out.setEEliminado(toBoolean(readValue(row, "e_eliminado", "eeliminado", "eliminado", "E_Eliminado")));
        return out;
    }

    /**
     * Completa datos de tecnico cuando el listado de rutas no trae nombre/cuenta/salesforce.
     */
    private void completarTecnicoFaltante(
            ConformacionCuadrillaWebResponse out,
            String sucursal,
            Map<Integer, Map<String, Object>> tecnicoDetalleCache) {
        if (out == null || out.getIdTecnico() == null || out.getIdTecnico() <= 0) {
            return;
        }
        boolean requiereDetalleTecnico = isBlank(out.getTecnico())
                || isBlank(out.getSalesforce())
                || isBlank(out.getCuentaSf())
                || isBlank(out.getHabilidad())
                || isBlank(out.getVehiculo())
                || (out.getIdTecnicoAuxiliar() == null || out.getIdTecnicoAuxiliar() <= 0)
                || isBlank(out.getAuxiliar())
                || (out.getIdUsuarioDigitador() == null || out.getIdUsuarioDigitador() <= 0)
                || isBlank(out.getDigitador());
        if (!requiereDetalleTecnico) {
            return;
        }

        Integer idTecnico = out.getIdTecnico();
        Map<String, Object> detalle = tecnicoDetalleCache.get(idTecnico);
        if (detalle == null) {
            List<Map<String, Object>> rows = repository.obtenerTecnicoDetalle(idTecnico, sucursal);
            if (rows != null && !rows.isEmpty()) {
                detalle = rows.get(0);
            } else {
                detalle = java.util.Collections.emptyMap();
            }
            tecnicoDetalleCache.put(idTecnico, detalle);
        }
        if (detalle.isEmpty()) {
            return;
        }

        if (isBlank(out.getTecnico())) {
            out.setTecnico(toString(readValue(detalle, "tecnico", "nombrevendedor", "vendedor", "nombre")));
        }
        if (isBlank(out.getSalesforce())) {
            out.setSalesforce(toString(readValue(
                    detalle,
                    "salesforce",
                    "SalesForce",
                    "nombreSalesforce",
                    "nombre_salesforce"
            )));
        }
        if (isBlank(out.getCuentaSf())) {
            out.setCuentaSf(toString(readValue(detalle, "cuentaSf", "cuenta_sf", "cuentasf", "CuentaSF")));
        }
        if (isBlank(out.getHabilidad())) {
            out.setHabilidad(toString(readValue(detalle, "habilidad", "Habilidad", "tipohabilidad")));
        }
        if (isBlank(out.getVehiculo())) {
            out.setVehiculo(toString(readValue(detalle, "vehiculo", "Vehiculo", "placa", "placavehiculo", "placaVehiculo")));
        }
        if (out.getIdTecnicoAuxiliar() == null || out.getIdTecnicoAuxiliar() <= 0) {
            Object idAux = readValue(
                    detalle,
                    "idTecnicoAuxiliar",
                    "id_tecnico_auxiliar",
                    "idtecnicoauxiliar",
                    "idtecnicoAuxiliar",
                    "id_tecnicoAuxiliar"
            );
            if (idAux == null) idAux = detalle.get("idtecnicoAuxiliar");
            if (idAux == null) idAux = detalle.get("idTecnicoAuxiliar");
            if (idAux == null) idAux = detalle.get("id_tecnico_auxiliar");
            out.setIdTecnicoAuxiliar(toInteger(idAux));
        }
        if (isBlank(out.getAuxiliar())) {
            Object aux = readValue(detalle, "auxiliar", "tecnicoauxiliar", "nombreauxiliar");
            if (aux == null) aux = detalle.get("auxiliar");
            out.setAuxiliar(toString(aux));
        }
        if (out.getIdUsuarioDigitador() == null || out.getIdUsuarioDigitador() <= 0) {
            out.setIdUsuarioDigitador(toInteger(readValue(
                    detalle,
                    "idUsuarioDigitador",
                    "id_usuario_digitador",
                    "idusuariodigitador",
                    "id_usuariodigitador"
            )));
        }
        if (isBlank(out.getDigitador())) {
            out.setDigitador(toString(readValue(
                    detalle,
                    "digitador",
                    "nombreDigitador",
                    "nombredigitador",
                    "usuariodigitador"
            )));
        }
    }

    /**
     * Completa auxiliar/digitador desde la relacion guardada por ruta.
     */
    private void completarRelacionRuta(
            ConformacionCuadrillaWebResponse out,
            Map<Integer, Map<String, Object>> relacionesByRuta) {
        if (out == null || out.getId() == null || relacionesByRuta == null || relacionesByRuta.isEmpty()) {
            return;
        }
        Integer idRuta = out.getId().intValue();
        Map<String, Object> relacion = relacionesByRuta.get(idRuta);
        if (relacion == null || relacion.isEmpty()) {
            return;
        }
        if (out.getIdTecnicoAuxiliar() == null) {
            out.setIdTecnicoAuxiliar(toInteger(readValue(relacion, "id_tecnico_auxiliar", "idtecnicoauxiliar", "idTecnicoAuxiliar")));
        }
        if (isBlank(out.getAuxiliar())) {
            out.setAuxiliar(toString(readValue(relacion, "auxiliar", "tecnicoauxiliar", "nombreauxiliar")));
        }
        if (out.getIdUsuarioDigitador() == null) {
            out.setIdUsuarioDigitador(toInteger(readValue(relacion, "id_usuario_digitador", "idusuariodigitador", "idUsuarioDigitador")));
        }
        if (isBlank(out.getDigitador())) {
            out.setDigitador(toString(readValue(relacion, "digitador", "nombreDigitador", "usuariodigitador")));
        }
    }

    private Map<Integer, Map<String, Object>> indexRelacionesByRuta(String sucursal) {
        Map<Integer, Map<String, Object>> out = new java.util.HashMap<>();
        List<Map<String, Object>> rows = backofficeRepository.listarRelacionesCuadrilla(sucursal);
        if (rows == null || rows.isEmpty()) {
            return out;
        }
        for (Map<String, Object> row : rows) {
            Integer idRuta = toInteger(readValue(row, "id_ruta", "idruta", "idRuta", "Id_Ruta"));
            if (idRuta == null || out.containsKey(idRuta)) {
                continue;
            }
            out.put(idRuta, row);
        }
        return out;
    }

    private Object readValue(Map<String, Object> row, String... keys) {
        if (row == null || row.isEmpty() || keys == null || keys.length == 0) {
            return null;
        }
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            String current = normalizeKey(entry.getKey());
            for (String key : keys) {
                if (current.equals(normalizeKey(key))) {
                    return entry.getValue();
                }
            }
        }
        return null;
    }

    private String resolverActividadDesdeRuta(Map<String, Object> row) {
        String actividad = toUpperTrim(readValue(row, "actividad", "tipoactividad", "tipo"));
        if ("BACKUP".equals(actividad)) {
            return "BACKUP";
        }
        if ("TITULAR".equals(actividad)) {
            return "TITULAR";
        }
        return "TITULAR";
    }

    private String toUpperTrim(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
            return null;
        }
        return text.toUpperCase(Locale.ROOT);
    }

    private String normalizeKey(String key) {
        if (key == null) {
            return "";
        }
        return key.replace("_", "").trim().toLowerCase(Locale.ROOT);
    }

    private Integer toInteger(Object value) {
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

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Boolean toBoolean(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue() != 0;
        }
        String text = String.valueOf(value).trim().toLowerCase(Locale.ROOT);
        if ("1".equals(text) || "true".equals(text) || "si".equals(text) || "s".equals(text)) {
            return true;
        }
        if ("0".equals(text) || "false".equals(text) || "no".equals(text) || "n".equals(text)) {
            return false;
        }
        return null;
    }

    private String toString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    /**
     * Bloquea asignar como auxiliar a una persona que ya es tecnico activo.
     */
    private void validarAuxiliarNoPuedeSerTecnicoActivo(
            Integer idTecnicoAuxiliar,
            Integer idTecnicoRequest,
            LocalDate fecha,
            String sucursal,
            Long idExcluir) {
        if (idTecnicoAuxiliar == null) {
            return;
        }
        Set<Integer> idsTecnicos = obtenerIdsTecnicosActivos(resolverFecha(fecha), sucursal, idExcluir);
        if (idTecnicoRequest != null) {
            idsTecnicos.add(idTecnicoRequest);
        }
        if (idsTecnicos.contains(idTecnicoAuxiliar)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "El auxiliar seleccionado corresponde a un tecnico activo y no puede asignarse como auxiliar."
            );
        }
    }

    /**
     * Lee ids de tecnicos activos del dia/sucursal desde BD central.
     */
    private Set<Integer> obtenerIdsTecnicosActivos(LocalDate fecha, String sucursal, Long idExcluir) {
        Set<Integer> idsTecnicos = new HashSet<>();
        List<Map<String, Object>> rows = backofficeRepository.listarConEliminadosCentral(fecha, sucursal, null, null);
        if (rows == null || rows.isEmpty()) {
            return idsTecnicos;
        }
        for (Map<String, Object> row : rows) {
            if (rowMapper.isEliminado(row)) {
                continue;
            }
            Long idRegistro = toLong(readValue(row, "id", "Id"));
            if (idExcluir != null && idRegistro != null && idExcluir.equals(idRegistro)) {
                continue;
            }
            Integer idTecnico = toInteger(readValue(row, "idTecnico", "id_tecnico", "idtecnico", "id_vendedor", "idvendedor"));
            if (idTecnico != null) {
                idsTecnicos.add(idTecnico);
            }
        }
        return idsTecnicos;
    }

    /**
     * Bloquea Salesforce repetido ya persistido en tbl_ConformacionCuadrillaDiario.
     */
    private void validarTecnicoNoDuplicado(
            String tecnico,
            LocalDate fecha,
            String sucursal,
            Long idExcluir,
            String errorPrefix) {
        String tecnicoValue = toString(tecnico);
        if (isBlank(tecnicoValue)) {
            return;
        }
        String tecnicoTrimmed = tecnicoValue.trim();
        if (tecnicoTrimmed.isEmpty()) {
            return;
        }

        Map<String, Object> existente = backofficeRepository.buscarRegistroActivoPorTecnicoEnContexto(
                resolverFecha(fecha),
                sucursal,
                tecnicoTrimmed,
                idExcluir
        );
        if (existente == null || existente.isEmpty()) {
            return;
        }

        Long idRegistro = toLong(readValue(existente, "id", "Id"));
        String tecnicoExistente = toString(readValue(existente, "tecnico", "nombrevendedor", "vendedor", "nombre"));
        StringBuilder detalle = new StringBuilder();
        if (!isBlank(tecnicoExistente)) {
            detalle.append(" | Tecnico: ").append(tecnicoExistente.trim());
        }
        if (idRegistro != null) {
            detalle.append(" | ID registro: ").append(idRegistro);
        }

        throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                errorPrefix + ": el tecnico '" + tecnicoTrimmed
                        + "' ya esta registrado en tbl_ConformacionCuadrillaDiario para la fecha."
                        + detalle + "."
        );
    }

    /**
     * Usa fecha actual cuando no se envia fecha en request.
     */
    private LocalDate resolverFecha(LocalDate fecha) {
        return fecha == null ? LocalDate.now() : fecha;
    }

    /**
     * Resuelve nombre de sucursal con prioridad: parametro > token > id como texto.
     */
    private String resolveSucursalNombre(String sucursal, String token) {
        if (!isBlank(sucursal)) {
            return SucursalCanonicalizer.canonicalize(sucursal);
        }
        if (isBlank(token)) {
            return null;
        }

        AuthMeResponse me = authService.me(token);
        Integer idSucursal = me.getUsuario() == null ? null : me.getUsuario().getIdSucursal();
        if (idSucursal == null) {
            return null;
        }

        List<SucursalResponse> sucursales = authService.listarSucursales();
        for (SucursalResponse item : sucursales) {
            if (item != null && idSucursal.equals(item.getIdSucursal())) {
                return SucursalCanonicalizer.canonicalize(item.getSucursal());
            }
        }
        return SucursalCanonicalizer.canonicalize(String.valueOf(idSucursal));
    }

    /**
     * Verifica si un texto es nulo o vacio.
     */
    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
