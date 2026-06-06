package com.example.TigoStarSystem.supervisor.service;

import com.example.TigoStarSystem.common.ApiException;
import com.example.TigoStarSystem.supervisor.SucursalCanonicalizer;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaCreateRequest;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaRelacionRequest;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaRowRequest;
import com.example.TigoStarSystem.supervisor.repository.ConformacionCuadrillaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;

@Service
public class ConformacionCuadrillaService {
    private final ConformacionCuadrillaRepository repository;
    private final ConformacionCuadrillaMailService mailService;
    private final ConformacionCuadrillaRequestValidator validator;
    private final ConformacionCuadrillaRowMapper rowMapper;

    /**
     * Inicializa el servicio principal de conformacion de cuadrillas.
     */
    public ConformacionCuadrillaService(
            ConformacionCuadrillaRepository repository,
            ConformacionCuadrillaMailService mailService) {
        this.repository = repository;
        this.mailService = mailService;
        this.validator = new ConformacionCuadrillaRequestValidator();
        this.rowMapper = new ConformacionCuadrillaRowMapper();
    }

    /**
     * Lista registros de conformacion segun fecha/sucursal/limite/tecnico.
     */
    public List<Map<String, Object>> listar(LocalDate fecha, String sucursal, Integer limite, Integer idTecnico) {
        return repository.listar(fecha, sucursal, limite, idTecnico);
    }

    /**
     * Obtiene el detalle de una conformacion y lo mapea al formato API.
     */
    public Map<String, Object> obtenerDetalle(Long id, String sucursal) {
        validarId(id);
        Map<String, Object> row = repository.obtenerPorId(id, sucursal);
        if (row == null || row.isEmpty()) {
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    "NOT_FOUND",
                    "Registro de conformacion cuadrilla no encontrado."
            );
        }
        return rowMapper.mapConfirmada(row, sucursal, null);
    }

    /**
     * Lista tecnicos con filtro por texto y limite.
     */
    public List<Map<String, Object>> listarTecnicos(String q, Integer limit, String sucursal) {
        return TecnicoSearchUtil.filterAndLimit(repository.listarTecnicos(sucursal), q, limit);
    }

    /**
     * Lista tecnicos para filtro de edicion con busqueda y limite.
     */
    public List<Map<String, Object>> listarTecnicosFiltroEdicion(String q, Integer limit, String sucursal) {
        return TecnicoSearchUtil.filterAndLimit(repository.listarTecnicosFiltroEdicion(sucursal), q, limit);
    }

    /**
     * Lista catalogo Salesforce/Cuenta SF desde tbl_SalesForce.
     */
    public List<Map<String, Object>> listarSalesforce(String q, Integer limit, String sucursal) {
        List<Map<String, Object>> items = rowMapper.deduplicarPorPrimerCampoNoNulo(
                repository.listarSalesforce(sucursal),
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
     * Lista auxiliares filtrados por texto y limite.
     */
    public List<Map<String, Object>> listarAuxiliares(String q, Integer limit) {
        return TecnicoSearchUtil.filterAndLimit(repository.listarAuxiliares(), q, limit);
    }

    /**
     * Retorna catalogo fijo de actividades permitidas.
     */
    public List<Map<String, Object>> listarActividades() {
        List<Map<String, Object>> actividades = new ArrayList<>();
        actividades.add(crearActividad("TITULAR"));
        actividades.add(crearActividad("BACKUP"));
        return actividades;
    }

    /**
     * Obtiene detalle de un tecnico por id.
     */
    public List<Map<String, Object>> obtenerTecnicoDetalle(Integer idTecnico) {
        if (idTecnico == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "idTecnico es requerido."
            );
        }
        return repository.obtenerTecnicoDetalle(idTecnico);
    }

    /**
     * Lista digitadores.
     */
    public List<Map<String, Object>> listarDigitadores() {
        return repository.listarDigitadores();
    }

    /**
     * Lista digitadores para edicion eliminando duplicados.
     */
    public List<Map<String, Object>> listarDigitadoresFiltroEdicion() {
        return rowMapper.deduplicarPorPrimerCampoNoNulo(
                repository.listarDigitadoresFiltroEdicion(),
                "idUsuarioDigitador",
                "id_usuario_digitador",
                "idusuariodigitador",
                "digitador"
        );
    }

    /**
     * Lista supervisores.
     */
    public List<Map<String, Object>> listarSupervisores() {
        return repository.listarSupervisores();
    }

    /**
     * Lista vehiculos y elimina duplicados por placa/vehiculo.
     */
    public List<Map<String, Object>> listarVehiculos(String filtro) {
        return rowMapper.deduplicarPorPrimerCampoNoNulo(
                repository.listarVehiculos(filtro),
                "vehiculo",
                "placa",
                "placavehiculo",
                "placaVehiculo"
        );
    }

    /**
     * Lista vehiculos para edicion, opcionalmente priorizando tecnico.
     */
    public List<Map<String, Object>> listarVehiculosFiltroEdicion(Integer idTecnico) {
        return rowMapper.deduplicarPorPrimerCampoNoNulo(
                repository.listarVehiculosFiltroEdicion(idTecnico),
                "vehiculo",
                "placa",
                "placavehiculo",
                "placaVehiculo"
        );
    }

    /**
     * Sobrecarga para listar grupos de edicion sin filtros.
     */
    public List<Map<String, Object>> listarGruposFiltroEdicion() {
        return listarGruposFiltroEdicion(null, null, null);
    }

    /**
     * Lista grupos de edicion deduplicados y filtrados por texto/limite.
     */
    public List<Map<String, Object>> listarGruposFiltroEdicion(String sucursal, String q, Integer limit) {
        List<Map<String, Object>> grupos = rowMapper.deduplicarPorPrimerCampoNoNulo(
                repository.listarGruposFiltroEdicion(sucursal),
                "grupo",
                "nombre",
                "ruta",
                "descripcion"
        );
        return rowMapper.filtrarPorTextoYLimite(
                grupos,
                q,
                limit,
                "grupo",
                "cuadrilla",
                "ruta",
                "nombre",
                "nombrevendedor",
                "tecnico"
        );
    }

    /**
     * Calcula cuadrillas pendientes comparando catalogo vs confirmadas del dia.
     */
    public List<Map<String, Object>> listarCuadrillasPendientes(
            LocalDate fecha,
            String sucursal,
            String q,
            Integer limit) {
        LocalDate fechaConsulta = resolverFecha(fecha);
        Integer limiteConsulta = (limit == null || limit <= 0) ? 100 : Math.min(limit, 1000);
        List<Map<String, Object>> rowsBackoffice = repository.listar(fechaConsulta, sucursal, limiteConsulta, null);
        List<Map<String, Object>> rowsConfirmadas = repository.listarConEliminadosCentral(fechaConsulta, sucursal, null, null);
        Set<String> clavesConfirmadas = obtenerClavesConfirmadas(rowsConfirmadas);
        List<Map<String, Object>> pendientes = new ArrayList<>();
        for (Map<String, Object> row : rowsBackoffice) {
            if (rowMapper.isEliminado(row)) {
                continue;
            }
            String key = rowMapper.claveCuadrillaDesdeCatalogo(row);
            if (key != null && clavesConfirmadas.contains(key)) {
                continue;
            }
            pendientes.add(rowMapper.mapConfirmada(row, sucursal, fechaConsulta));
        }

        return rowMapper.filtrarPorTextoYLimite(
                pendientes,
                q,
                limit,
                "grupo",
                "cuadrilla",
                "ruta",
                "nombre",
                "nombrevendedor",
                "tecnico",
                "vehiculo"
        );
    }

    /**
     * Lista cuadrillas confirmadas del dia.
     */
    public List<Map<String, Object>> listarCuadrillasConfirmadas(
            LocalDate fecha,
            String sucursal,
            String q,
            Integer limit) {
        LocalDate fechaConsulta = resolverFecha(fecha);
        List<Map<String, Object>> rows = repository.listarConEliminadosCentral(fechaConsulta, sucursal, null, null);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            if (rowMapper.isEliminado(row)) {
                continue;
            }
            out.add(rowMapper.mapConfirmada(row, sucursal, fechaConsulta));
        }
        return rowMapper.filtrarPorTextoYLimite(
                out,
                q,
                limit,
                "grupo",
                "cuadrilla",
                "ruta",
                "tecnico",
                "auxiliar",
                "digitador",
                "supervisoracargo",
                "observacion",
                "vehiculo"
        );
    }

    /**
     * Lista cuadrillas eliminadas del dia.
     */
    public List<Map<String, Object>> listarCuadrillasEliminadas(
            LocalDate fecha,
            String sucursal,
            String q,
            Integer limit) {
        LocalDate fechaConsulta = resolverFecha(fecha);
        List<Map<String, Object>> rows = repository.listarConEliminadosCentral(fechaConsulta, sucursal, null, null);
        List<Map<String, Object>> out = new ArrayList<>();

        for (Map<String, Object> row : rows) {
            if (!rowMapper.isEliminado(row)) {
                continue;
            }
            out.add(rowMapper.mapConfirmada(row, sucursal, fechaConsulta));
        }

        return rowMapper.filtrarPorTextoYLimite(
                out,
                q,
                limit,
                "grupo",
                "cuadrilla",
                "ruta",
                "tecnico",
                "auxiliar",
                "digitador",
                "supervisoracargo",
                "observacion",
                "vehiculo"
        );
    }

    /**
     * Devuelve sucursales para selector de interfaz.
     */
    public List<Map<String, Object>> obtenerSucursalActual() {
        return repository.obtenerSucursalActual();
    }

    /**
     * Guarda una o varias filas de conformacion y dispara notificacion.
     */
    public int guardar(ConformacionCuadrillaCreateRequest request) {
        validarRequestCreacion(request);

        Map<String, Set<Integer>> tecnicosEnSolicitudPorContexto = new HashMap<>();
        Map<String, Map<String, Integer>> salesforceEnSolicitudPorContexto = new HashMap<>();
        for (int idx = 0; idx < request.getFilas().size(); idx++) {
            ConformacionCuadrillaRowRequest fila = request.getFilas().get(idx);
            validator.validarBackoffice(fila);
            LocalDate fechaFila = resolverFecha(fila.getFecha());
            String sucursalFila = SucursalCanonicalizer.canonicalize(toTrimmedString(fila.getSucursal()));
            String contextKey = buildContextKey(fechaFila, sucursalFila);
            Set<Integer> tecnicos = tecnicosEnSolicitudPorContexto.computeIfAbsent(contextKey, key -> new HashSet<>());
            if (fila.getIdTecnico() != null) {
                tecnicos.add(fila.getIdTecnico());
            }
            validarSalesforceNoDuplicadoEnSolicitud(
                    fila,
                    idx + 1,
                    contextKey,
                    salesforceEnSolicitudPorContexto
            );
            validarTecnicoNoDuplicadoEnBd(
                    fila.getTecnico(),
                    fechaFila,
                    sucursalFila,
                    null,
                    buildRowTecnicoPrefix(fila, idx + 1)
            );
        }

        Map<String, Set<Integer>> tecnicosActivosPorContexto = new HashMap<>();
        int total = 0;
        for (ConformacionCuadrillaRowRequest fila : request.getFilas()) {
            LocalDate fechaFila = resolverFecha(fila.getFecha());
            String sucursalFila = SucursalCanonicalizer.canonicalize(toTrimmedString(fila.getSucursal()));
            String contextKey = buildContextKey(fechaFila, sucursalFila);
            Set<Integer> tecnicosActivos = tecnicosActivosPorContexto.get(contextKey);
            if (tecnicosActivos == null) {
                tecnicosActivos = obtenerIdsTecnicosActivosPorContexto(fechaFila, sucursalFila, null);
                tecnicosActivosPorContexto.put(contextKey, tecnicosActivos);
            }
            validarAuxiliarNoPuedeSerTecnicoActivo(
                    fila.getIdTecnicoAuxiliar(),
                    tecnicosActivos,
                    tecnicosEnSolicitudPorContexto.get(contextKey)
            );
            total += repository.guardarFilaConfirmada(fila);
        }

        if (total <= 0) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "INSERT_FAILED",
                    "No se pudo guardar la cuadrilla en BDControlOrdenes."
            );
        }

        enviarCorreoCuadrillasNoConfirmadas(request.getFilas());
        return total;
    }

    /**
     * Actualiza una fila existente y notifica por correo si hubo cambios.
     */
    public int actualizar(Long id, ConformacionCuadrillaRowRequest request) {
        validarId(id);
        validator.validarBackoffice(request);
        LocalDate fechaFila = resolverFecha(request.getFecha());
        String sucursalFila = SucursalCanonicalizer.canonicalize(toTrimmedString(request.getSucursal()));
        validarTecnicoNoDuplicadoEnBd(
                request.getTecnico(),
                fechaFila,
                sucursalFila,
                id,
                "Registro"
        );
        Set<Integer> tecnicosRequest = new HashSet<>();
        if (request.getIdTecnico() != null) {
            tecnicosRequest.add(request.getIdTecnico());
        }
        validarAuxiliarNoPuedeSerTecnicoActivo(
                request.getIdTecnicoAuxiliar(),
                obtenerIdsTecnicosActivosPorContexto(fechaFila, sucursalFila, id),
                tecnicosRequest
        );
        int affected = repository.actualizarFila(id, request);
        if (affected > 0) {
            List<ConformacionCuadrillaRowRequest> filas = new ArrayList<>();
            filas.add(request);
            enviarCorreoCuadrillasNoConfirmadas(filas);
        }
        return affected;
    }

    /**
     * Guarda o actualiza la relacion de una ruta con auxiliar/digitador.
     */
    public int guardarRelacionCuadrilla(ConformacionCuadrillaRelacionRequest request) {
        validarRelacionCuadrillaRequest(request);
        request.setSucursal(SucursalCanonicalizer.canonicalize(toTrimmedString(request.getSucursal())));
        request.setAuxiliar(toTrimmedString(request.getAuxiliar()));
        request.setDigitador(toTrimmedString(request.getDigitador()));
        if (request.getActivo() == null) {
            request.setActivo(true);
        }

        Map<Integer, String> auxiliaresById = indexAuxiliaresById();
        Map<Integer, String> digitadoresById = indexDigitadoresById();

        if (isBlankValue(request.getAuxiliar()) && request.getIdTecnicoAuxiliar() != null) {
            request.setAuxiliar(toTrimmedString(auxiliaresById.get(request.getIdTecnicoAuxiliar())));
        }
        if (isBlankValue(request.getDigitador()) && request.getIdUsuarioDigitador() != null) {
            request.setDigitador(toTrimmedString(digitadoresById.get(request.getIdUsuarioDigitador())));
        }
        if (request.getIdTecnicoAuxiliar() != null && !isBlankValue(request.getSucursal())) {
            validarAuxiliarNoPuedeSerTecnicoActivo(
                    request.getIdTecnicoAuxiliar(),
                    obtenerIdsTecnicosActivosPorContexto(resolverFecha(null), request.getSucursal(), null),
                    null
            );
        }

        return repository.guardarRelacionCuadrilla(request);
    }

    /**
     * Construye conjunto de claves de cuadrillas ya confirmadas.
     */
    private Set<String> obtenerClavesConfirmadas(List<Map<String, Object>> confirmadas) {
        Set<String> claves = new HashSet<>();
        if (confirmadas == null || confirmadas.isEmpty()) {
            return claves;
        }

        for (Map<String, Object> row : confirmadas) {
            String key = rowMapper.claveCuadrillaDesdeConfirmada(row);
            if (key != null) {
                claves.add(key);
            }
        }
        return claves;
    }

    /**
     * Envia correo con cuadrillas faltantes usando sucursal de las filas.
     */
    private void enviarCorreoCuadrillasNoConfirmadas(List<ConformacionCuadrillaRowRequest> filas) {
        String sucursal = filas.isEmpty() ? null : filas.get(0).getSucursal();
        mailService.enviarDetalleCuadrillasNoConfirmadas(
                repository.listarGruposFiltroEdicion(sucursal),
                filas
        );
    }

    /**
     * Indexa la ultima confirmacion por tecnico, priorizando registros de ayer.
     */
    private Map<Integer, Map<String, Object>> indexUltimaConfirmacionPorTecnico(LocalDate fechaConsulta, String sucursal) {
        Map<Integer, Map<String, Object>> exactAyer = new HashMap<>();
        Map<Integer, Map<String, Object>> previas = new HashMap<>();
        if (fechaConsulta == null) {
            return previas;
        }

        LocalDate fechaAyer = fechaConsulta.minusDays(1);
        List<Map<String, Object>> rows = repository.listar(null, sucursal, null, null);
        if (rows == null || rows.isEmpty()) {
            return previas;
        }

        for (Map<String, Object> row : rows) {
            LocalDate fechaRow = valueAsLocalDate(getCaseInsensitive(row, "fecha"));
            if (fechaRow == null || !fechaRow.isBefore(fechaConsulta)) {
                continue;
            }

            Integer idTecnico = valueAsInteger(getCaseInsensitive(
                    row,
                    "id_tecnico",
                    "idtecnico",
                    "idTecnico",
                    "id_vendedor",
                    "idvendedor"
            ));
            if (idTecnico == null) {
                continue;
            }

            if (!previas.containsKey(idTecnico)) {
                previas.put(idTecnico, row);
            }
            if (fechaRow.equals(fechaAyer) && !exactAyer.containsKey(idTecnico)) {
                exactAyer.put(idTecnico, row);
            }
        }

        previas.putAll(exactAyer);
        return previas;
    }

    /**
     * Completa campos faltantes en pendiente usando datos historicos del tecnico.
     */
    private void aplicarSugerenciasDesdeHistorico(Map<String, Object> pendiente, Map<String, Object> historico) {
        if (pendiente == null || pendiente.isEmpty() || historico == null || historico.isEmpty()) {
            return;
        }

        setIfBlankWithAliases(
                pendiente,
                getCaseInsensitive(historico, "id_tecnicoAuxiliar", "idtecnicoauxiliar", "id_tecnico_auxiliar"),
                "idTecnicoAuxiliar",
                "id_tecnicoAuxiliar",
                "id_tecnico_auxiliar",
                "idtecnicoauxiliar"
        );
        setIfBlankWithAliases(
                pendiente,
                getCaseInsensitive(historico, "auxiliar", "tecnicoauxiliar", "nombreauxiliar"),
                "auxiliar"
        );
        setIfBlankWithAliases(
                pendiente,
                getCaseInsensitive(historico, "idUsuarioDigitador", "id_usuario_digitador", "idusuariodigitador"),
                "idUsuarioDigitador",
                "id_usuario_digitador",
                "idusuariodigitador"
        );
        setIfBlankWithAliases(
                pendiente,
                getCaseInsensitive(historico, "digitador", "nombredigitador", "usuarioDigitador"),
                "digitador"
        );
        setIfBlankWithAliases(
                pendiente,
                getCaseInsensitive(historico, "idUsuarioSupervisor", "id_usuario_supervisor", "idusuariosupervisor", "idsupervisor"),
                "idUsuarioSupervisor",
                "id_usuario_supervisor",
                "idusuariosupervisor"
        );
        setIfBlankWithAliases(
                pendiente,
                getCaseInsensitive(historico, "supervisorACargo", "supervisor_a_cargo", "supervisor", "nombresupervisor"),
                "supervisorACargo",
                "supervisor_a_cargo",
                "supervisor"
        );

        Object vehiculoHistorico = getCaseInsensitive(historico, "vehiculo", "Vehiculo", "placa", "placavehiculo", "placaVehiculo");
        if (isBlankValue(getCaseInsensitive(pendiente, "vehiculo", "Vehiculo")) && !isBlankValue(vehiculoHistorico)) {
            pendiente.put("vehiculo", vehiculoHistorico);
            pendiente.put("Vehiculo", vehiculoHistorico);
        }
    }

    /**
     * Aplica asignaciones desde tabla de relacion de cuadrillas.
     */
    private void aplicarRelacionCuadrilla(Map<String, Object> pendiente, Map<String, Object> relacion) {
        if (pendiente == null || pendiente.isEmpty() || relacion == null || relacion.isEmpty()) {
            return;
        }

        setWithAliases(
                pendiente,
                getCaseInsensitive(relacion, "id_tecnico_auxiliar", "idtecnicoauxiliar", "idTecnicoAuxiliar"),
                "idTecnicoAuxiliar",
                "id_tecnicoAuxiliar",
                "id_tecnico_auxiliar",
                "idtecnicoauxiliar"
        );
        setWithAliases(
                pendiente,
                getCaseInsensitive(relacion, "auxiliar"),
                "auxiliar"
        );
        setWithAliases(
                pendiente,
                getCaseInsensitive(relacion, "id_usuario_digitador", "idusuariodigitador", "idUsuarioDigitador"),
                "idUsuarioDigitador",
                "id_usuario_digitador",
                "idusuariodigitador"
        );
        setWithAliases(
                pendiente,
                getCaseInsensitive(relacion, "digitador"),
                "digitador"
        );
    }

    /**
     * Completa auxiliar y digitador en pendientes usando catalogos por id.
     * Si no hay coincidencia, usa literal para evitar campos en blanco.
     */
    private void completarAsignacionesPendiente(
            Map<String, Object> pendiente,
            Map<Integer, String> auxiliaresById,
            Map<Integer, String> digitadoresById) {
        if (pendiente == null || pendiente.isEmpty()) {
            return;
        }

        Object auxiliarActual = getCaseInsensitive(pendiente, "auxiliar");
        if (isBlankValue(auxiliarActual)) {
            Integer idAuxiliar = valueAsInteger(getCaseInsensitive(
                    pendiente,
                    "idTecnicoAuxiliar",
                    "id_tecnicoAuxiliar",
                    "idtecnicoauxiliar",
                    "id_tecnico_auxiliar"
            ));
            String auxiliar = idAuxiliar == null ? null : auxiliaresById.get(idAuxiliar);
            if (isBlankValue(auxiliar)) {
                auxiliar = "SIN ASIGNAR";
            }
            setIfBlankWithAliases(pendiente, auxiliar, "auxiliar");
        }

        Object digitadorActual = getCaseInsensitive(pendiente, "digitador");
        if (isBlankValue(digitadorActual)) {
            Integer idDigitador = valueAsInteger(getCaseInsensitive(
                    pendiente,
                    "idUsuarioDigitador",
                    "id_usuario_digitador",
                    "idusuariodigitador"
            ));
            String digitador = idDigitador == null ? null : digitadoresById.get(idDigitador);
            if (isBlankValue(digitador)) {
                digitador = "SIN ASIGNAR";
            }
            setIfBlankWithAliases(pendiente, digitador, "digitador");
        }
    }

    /**
     * Indexa auxiliares por id desde catalogo de tecnicos auxiliares.
     */
    private Map<Integer, String> indexAuxiliaresById() {
        return indexNombreById(
                repository.listarAuxiliares(),
                new String[] {
                        "idTecnicoAuxiliar",
                        "id_tecnicoAuxiliar",
                        "idtecnicoauxiliar",
                        "id_tecnico_auxiliar",
                        "id_tecnico",
                        "idtecnico",
                        "id_vendedor",
                        "idvendedor",
                        "Id_TecnicoAuxiliar",
                        "Id_Tecnico",
                        "Id_Vendedor"
                },
                new String[] {
                        "auxiliar",
                        "tecnicoauxiliar",
                        "nombreauxiliar",
                        "tecnico",
                        "nombrevendedor",
                        "vendedor",
                        "nombre",
                        "NombreAuxiliar",
                        "Nombre"
                }
        );
    }

    /**
     * Indexa digitadores por id desde catalogo de digitadores.
     */
    private Map<Integer, String> indexDigitadoresById() {
        return indexNombreById(
                repository.listarDigitadores(),
                new String[] {
                        "idUsuarioDigitador",
                        "id_usuario_digitador",
                        "idusuariodigitador",
                        "id_usuario",
                        "idusuario",
                        "Id_UsuarioDigitador",
                        "Id_Usuario"
                },
                new String[] {
                        "digitador",
                        "nombredigitador",
                        "usuarioDigitador",
                        "nombre",
                        "NombreDigitador",
                        "Nombre"
                }
        );
    }

    /**
     * Indexa relaciones de cuadrilla por id de ruta.
     */
    private Map<Integer, Map<String, Object>> indexRelacionesByRuta(String sucursal) {
        Map<Integer, Map<String, Object>> out = new HashMap<>();
        List<Map<String, Object>> rows = repository.listarRelacionesCuadrilla(sucursal);
        if (rows == null || rows.isEmpty()) {
            return out;
        }
        for (Map<String, Object> row : rows) {
            Integer idRuta = valueAsInteger(getCaseInsensitive(row, "id_ruta", "idruta", "idRuta", "Id_Ruta"));
            if (idRuta == null || out.containsKey(idRuta)) {
                continue;
            }
            out.put(idRuta, row);
        }
        return out;
    }

    /**
     * Construye indice id->nombre ignorando filas incompletas.
     */
    private Map<Integer, String> indexNombreById(
            List<Map<String, Object>> rows,
            String[] idKeys,
            String[] nombreKeys) {
        Map<Integer, String> out = new HashMap<>();
        if (rows == null || rows.isEmpty()) {
            return out;
        }
        for (Map<String, Object> row : rows) {
            Integer id = valueAsInteger(getCaseInsensitive(row, idKeys));
            String nombre = toTrimmedString(getCaseInsensitive(row, nombreKeys));
            if (id == null || isBlankValue(nombre) || out.containsKey(id)) {
                continue;
            }
            out.put(id, nombre);
        }
        return out;
    }

    /**
     * Escribe valor en aliases solo cuando el campo actual esta vacio.
     */
    private void setIfBlankWithAliases(Map<String, Object> target, Object value, String... aliases) {
        if (target == null || aliases == null || aliases.length == 0 || isBlankValue(value)) {
            return;
        }
        Object current = getCaseInsensitive(target, aliases);
        if (!isBlankValue(current)) {
            return;
        }
        for (String alias : aliases) {
            target.put(alias, value);
        }
    }

    /**
     * Escribe valor en aliases sin validar estado previo del campo destino.
     */
    private void setWithAliases(Map<String, Object> target, Object value, String... aliases) {
        if (target == null || aliases == null || aliases.length == 0 || isBlankValue(value)) {
            return;
        }
        for (String alias : aliases) {
            target.put(alias, value);
        }
    }

    /**
     * Busca valor por varias claves ignorando diferencias de formato.
     */
    private Object getCaseInsensitive(Map<String, Object> row, String... keys) {
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

    /**
     * Normaliza una clave para comparacion case-insensitive.
     */
    private String normalizeKey(String key) {
        if (key == null) {
            return "";
        }
        return key.replace("_", "").trim().toLowerCase();
    }

    /**
     * Convierte valor dinamico a Integer de forma segura.
     */
    private Integer valueAsInteger(Object value) {
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

    /**
     * Convierte valor dinamico a LocalDate soportando varios tipos.
     */
    private LocalDate valueAsLocalDate(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDate) {
            return (LocalDate) value;
        }
        if (value instanceof Date) {
            return ((Date) value).toLocalDate();
        }
        if (value instanceof Timestamp) {
            return ((Timestamp) value).toLocalDateTime().toLocalDate();
        }
        if (value instanceof LocalDateTime) {
            return ((LocalDateTime) value).toLocalDate();
        }
        try {
            return LocalDate.parse(String.valueOf(value).trim());
        } catch (Exception ex) {
            return null;
        }
    }

    /**
     * Indica si un valor se considera vacio (null o string en blanco).
     */
    private boolean isBlankValue(Object value) {
        if (value == null) {
            return true;
        }
        if (value instanceof String) {
            return ((String) value).trim().isEmpty();
        }
        return false;
    }

    /**
     * Convierte valor dinamico a texto con trim, devolviendo null si queda vacio.
     */
    private String toTrimmedString(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    /**
     * Bloquea asignar como auxiliar a una persona que ya es tecnico activo.
     */
    private void validarAuxiliarNoPuedeSerTecnicoActivo(
            Integer idTecnicoAuxiliar,
            Set<Integer> tecnicosActivos,
            Set<Integer> tecnicosEnSolicitud) {
        if (idTecnicoAuxiliar == null) {
            return;
        }
        Set<Integer> idsTecnicos = new HashSet<>();
        if (tecnicosActivos != null) {
            idsTecnicos.addAll(tecnicosActivos);
        }
        if (tecnicosEnSolicitud != null) {
            idsTecnicos.addAll(tecnicosEnSolicitud);
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
     * Bloquea Salesforce repetido dentro de la misma solicitud por fecha+sucursal.
     */
    private void validarSalesforceNoDuplicadoEnSolicitud(
            ConformacionCuadrillaRowRequest fila,
            int filaNumero,
            String contextKey,
            Map<String, Map<String, Integer>> salesforceEnSolicitudPorContexto) {
        String salesforce = toTrimmedString(fila == null ? null : fila.getSalesforce());
        if (isBlankValue(salesforce)) {
            return;
        }

        String salesforceKey = normalizeKey(salesforce);
        Map<String, Integer> salesforcePorContexto =
                salesforceEnSolicitudPorContexto.computeIfAbsent(contextKey, key -> new HashMap<>());
        Integer filaAnterior = salesforcePorContexto.putIfAbsent(salesforceKey, filaNumero);
        if (filaAnterior != null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    buildRowTecnicoPrefix(fila, filaNumero)
                            + ": el salesforce '" + salesforce + "' esta repetido en la solicitud (fila "
                            + filaAnterior + ")."
            );
        }
    }

    /**
     * Bloquea Salesforce repetido ya persistido en tbl_ConformacionCuadrillaDiario.
     */
    private void validarTecnicoNoDuplicadoEnBd(
            String tecnico,
            LocalDate fecha,
            String sucursal,
            Long idExcluir,
            String errorPrefix) {
        String tecnicoValue = toTrimmedString(tecnico);
        if (isBlankValue(tecnicoValue)) {
            return;
        }

        Map<String, Object> existente = repository.buscarRegistroActivoPorTecnicoEnContexto(
                fecha,
                sucursal,
                tecnicoValue,
                idExcluir
        );
        if (existente == null || existente.isEmpty()) {
            return;
        }

        Long idRegistro = valueAsLong(getCaseInsensitive(existente, "id", "Id"));
        String tecnicoExistente = toTrimmedString(getCaseInsensitive(existente, "tecnico", "nombrevendedor", "vendedor", "nombre"));
        StringBuilder detalle = new StringBuilder();
        if (!isBlankValue(tecnicoExistente)) {
            detalle.append(" | Tecnico: ").append(tecnicoExistente);
        }
        if (idRegistro != null) {
            detalle.append(" | ID registro: ").append(idRegistro);
        }

        throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                errorPrefix + ": el tecnico '" + tecnicoValue
                        + "' ya esta registrado en tbl_ConformacionCuadrillaDiario para la fecha."
                        + detalle + "."
        );
    }

    private String buildRowTecnicoPrefix(ConformacionCuadrillaRowRequest fila, int filaNumero) {
        String tecnico = toTrimmedString(fila == null ? null : fila.getTecnico());
        if (isBlankValue(tecnico)) {
            return "Fila " + filaNumero;
        }
        return "Fila " + filaNumero + " | Tecnico: " + tecnico;
    }

    /**
     * Obtiene ids de tecnicos activos por fecha y sucursal desde BD central.
     */
    private Set<Integer> obtenerIdsTecnicosActivosPorContexto(LocalDate fecha, String sucursal, Long idExcluir) {
        Set<Integer> idsTecnicos = new HashSet<>();
        List<Map<String, Object>> rows = repository.listarConEliminadosCentral(fecha, sucursal, null, null);
        if (rows == null || rows.isEmpty()) {
            return idsTecnicos;
        }
        for (Map<String, Object> row : rows) {
            if (rowMapper.isEliminado(row)) {
                continue;
            }
            Long idRegistro = valueAsLong(getCaseInsensitive(row, "id", "Id"));
            if (idExcluir != null && idRegistro != null && idExcluir.equals(idRegistro)) {
                continue;
            }
            Integer idTecnico = valueAsInteger(getCaseInsensitive(
                    row,
                    "idTecnico",
                    "id_tecnico",
                    "idtecnico",
                    "id_vendedor",
                    "idvendedor"
            ));
            if (idTecnico != null) {
                idsTecnicos.add(idTecnico);
            }
        }
        return idsTecnicos;
    }

    /**
     * Convierte valor dinamico a Long de forma segura.
     */
    private Long valueAsLong(Object value) {
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

    /**
     * Clave interna para cachear validaciones por fecha+sucursal.
     */
    private String buildContextKey(LocalDate fecha, String sucursal) {
        String fechaKey = fecha == null ? "" : fecha.toString();
        return fechaKey + "|" + normalizeKey(toTrimmedString(sucursal));
    }

    /**
     * Valida request de relacion ruta->auxiliar/digitador.
     */
    private void validarRelacionCuadrillaRequest(ConformacionCuadrillaRelacionRequest request) {
        if (request == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "Request de relacion cuadrilla es requerido."
            );
        }
        if (request.getIdRuta() == null || request.getIdRuta() <= 0) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "idRuta es requerido."
            );
        }

        boolean tieneAuxiliar = request.getIdTecnicoAuxiliar() != null || !isBlankValue(request.getAuxiliar());
        boolean tieneDigitador = request.getIdUsuarioDigitador() != null || !isBlankValue(request.getDigitador());
        if (!tieneAuxiliar && !tieneDigitador) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "Debe enviar idTecnicoAuxiliar/auxiliar o idUsuarioDigitador/digitador."
            );
        }
    }

    /**
     * Verifica que el request de creacion tenga al menos una fila.
     */
    private void validarRequestCreacion(ConformacionCuadrillaCreateRequest request) {
        if (request == null || request.getFilas() == null || request.getFilas().isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "Debe enviar filas para registrar."
            );
        }
    }

    /**
     * Valida que un id sea positivo.
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
     * Usa fecha actual cuando no se envio fecha de consulta.
     */
    private LocalDate resolverFecha(LocalDate fecha) {
        return fecha == null ? LocalDate.now() : fecha;
    }

    /**
     * Crea un item simple para el catalogo de actividades.
     */
    private Map<String, Object> crearActividad(String actividad) {
        Map<String, Object> item = new java.util.HashMap<>();
        item.put("actividad", actividad);
        return item;
    }
}
