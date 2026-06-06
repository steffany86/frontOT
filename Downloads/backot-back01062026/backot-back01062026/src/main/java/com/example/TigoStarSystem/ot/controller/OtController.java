package com.example.TigoStarSystem.ot.controller;

import com.example.TigoStarSystem.auth.dto.AuthMeResponse;
import com.example.TigoStarSystem.auth.service.AuthService;
import com.example.TigoStarSystem.common.ApiException;
import com.example.TigoStarSystem.common.ApiResponse;
import com.example.TigoStarSystem.ot.dto.OtCrearRequest;
import com.example.TigoStarSystem.ot.dto.OtCrearResponse;
import com.example.TigoStarSystem.ot.dto.OtDetalleMaterialRequest;
import com.example.TigoStarSystem.ot.dto.OtRegistrarDetalleAgendaRequest;
import com.example.TigoStarSystem.ot.dto.OtRegistrarDetalleAgendaResponse;
import com.example.TigoStarSystem.ot.dto.OtRegistrarCargoUsuarioRequest;
import com.example.TigoStarSystem.ot.dto.OtModificarDatosRequest;
import com.example.TigoStarSystem.ot.dto.OtModificarFechaRequest;
import com.example.TigoStarSystem.ot.dto.OtModificarFechaResponse;
import com.example.TigoStarSystem.ot.dto.OtRegistroAgendaValidacionResponse;
import com.example.TigoStarSystem.ot.dto.OtRegistrarVentaRequest;
import com.example.TigoStarSystem.ot.dto.OtRegistrarVentaResponse;
import com.example.TigoStarSystem.ot.dto.OtRealizadaRequest;
import com.example.TigoStarSystem.ot.dto.OtValidarVentaDetalleResponse;
import com.example.TigoStarSystem.ot.service.OtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Validated
@RestController
@RequestMapping("/ot")
public class OtController {
    private static final Logger logger = LoggerFactory.getLogger(OtController.class);
    private final OtService otService;
    private final AuthService authService;

    public OtController(OtService otService, AuthService authService) {
        this.otService = otService;
        this.authService = authService;
    }

    @PostMapping("/realizada")
    public ResponseEntity<ApiResponse<Integer>> registrarOtRealizada(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @Valid @RequestBody OtRealizadaRequest request) {
        int filas = otService.registrarOtRealizada(request, resolveIdSucursal(token));
        return ResponseEntity.ok(ApiResponse.of(filas, "OT actualizada como realizada."));
    }

    @PostMapping(
            value = {"/spx_RegistrarVentaParaRegistroOTwb", "/venta/registro-otwb"},
            consumes = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ApiResponse<OtRegistrarVentaResponse>> registrarVentaParaRegistroOtWb(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @Valid @RequestBody OtRegistrarVentaRequest request) {
        OtRegistrarVentaResponse response = otService.registrarVentaParaRegistroOtWb(request, resolveIdSucursal(token));
        return ResponseEntity.ok(ApiResponse.of(response, "Registro exitoso."));
    }

    @PostMapping(
            value = {"/spx_RegistrarVentaParaRegistroOTwb", "/venta/registro-otwb"},
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<ApiResponse<OtRegistrarVentaResponse>> registrarVentaParaRegistroOtWbMultipart(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @Valid @RequestPart("payload") OtRegistrarVentaRequest request,
            @RequestPart("pdf") MultipartFile pdf) {
        OtRegistrarVentaResponse response = otService.registrarVentaParaRegistroOtWb(request, resolveIdSucursal(token), pdf);
        return ResponseEntity.ok(ApiResponse.of(response, "Registro exitoso."));
    }

    @PostMapping("/detalle-materiales")
    public ResponseEntity<ApiResponse<OtRegistrarDetalleAgendaResponse>> registrarDetalleMateriales(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "idSucursal", required = false) Integer idSucursal,
            @RequestBody OtRegistrarDetalleAgendaRequest request) {
        Map<String, Object> snapshot = buildDetalleMaterialesSnapshot(request);
        logger.info(
                "POST /ot/detalle-materiales request tokenPresent={}, idSucursalParam={}, payload={}",
                !isBlank(token),
                idSucursal,
                snapshot
        );
        try {
            Integer idSucursalResolved = resolveIdSucursal(token, idSucursal);
            logger.info(
                    "POST /ot/detalle-materiales resolved idSucursal={} tokenPresent={}",
                    idSucursalResolved,
                    !isBlank(token)
            );
            OtRegistrarDetalleAgendaResponse response = otService.registrarDetalleAgenda(request, idSucursalResolved);
            return ResponseEntity.ok(ApiResponse.of(response, "Detalle de OT registrado correctamente."));
        } catch (ApiException ex) {
            logger.error(
                    "POST /ot/detalle-materiales error code={} status={} message={} tokenPresent={} idSucursalParam={} payload={}",
                    ex.getCode(),
                    ex.getStatus(),
                    ex.getMessage(),
                    !isBlank(token),
                    idSucursal,
                    snapshot
            );
            throw ex;
        } catch (RuntimeException ex) {
            logger.error(
                    "POST /ot/detalle-materiales runtime error tokenPresent={} idSucursalParam={} payload={}",
                    !isBlank(token),
                    idSucursal,
                    snapshot,
                    ex
            );
            throw ex;
        }
    }

    @PostMapping("/cargo-usuario")
    public ResponseEntity<ApiResponse<Map<String, Object>>> registrarCargoUsuario(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "idSucursal", required = false) Integer idSucursal,
            @RequestBody OtRegistrarCargoUsuarioRequest request) {
        int filas = otService.registrarCargoUsuario(request, resolveIdSucursal(token, idSucursal));
        Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("guardados", filas);
        return ResponseEntity.ok(ApiResponse.of(
                response,
                "Cargo usuario registrado correctamente."
        ));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OtCrearResponse>> crearOt(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @Valid @RequestBody OtCrearRequest request) {
        AuthMeResponse me = resolveSession(token);
        Integer idSucursal = extractIdSucursal(me);

        if (me != null && me.getUsuario() != null && me.getUsuario().getRol() != null) {
            String rol = me.getUsuario().getRol().trim().toLowerCase();
            if (rol.equals("tecnico")) {
                request.setIdUsuario(me.getUsuario().getIdUsuario());
            }
        }

        OtCrearResponse response = otService.crearOt(request, idSucursal);
        return ResponseEntity.ok(ApiResponse.of(response, "OT registrada."));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarOt(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "idSucursal", required = false) Integer idSucursalParam,
            @RequestParam(value = "fecha", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(value = "inicio", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(value = "fin", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin,
            @RequestParam(value = "usuario", required = false) Integer idUsuario,
            @RequestParam(value = "rol", required = false) String rol,
            @RequestParam(value = "pendiente", required = false) Boolean pendiente) {
        AuthMeResponse me = resolveSession(token);
        Integer idSucursal = resolveIdSucursal(token, idSucursalParam);

        Integer idUsuarioFiltro = idUsuario;
        String rolFiltro = rol;
        if (me != null && me.getUsuario() != null) {
            String rolSesion = me.getUsuario().getRol();
            if (rolSesion != null && rolSesion.trim().equalsIgnoreCase("tecnico")) {
                idUsuarioFiltro = me.getUsuario().getIdUsuario();
                rolFiltro = rolSesion;
            }
        }

        if (fecha != null) {
            return ResponseEntity.ok(ApiResponse.of(
                    otService.filtrarListado(
                            otService.listarPorFecha(fecha, idSucursal),
                            idUsuarioFiltro,
                            rolFiltro,
                            pendiente,
                            me != null && me.getUsuario() != null ? me.getUsuario().getNombre() : null,
                            idSucursal),
                    "Listado de OT por fecha."));
        }
        if (inicio != null && fin != null) {
            return ResponseEntity.ok(ApiResponse.of(
                    otService.filtrarListado(
                            otService.listarPorRango(inicio, fin, idSucursal),
                            idUsuarioFiltro,
                            rolFiltro,
                            pendiente,
                            me != null && me.getUsuario() != null ? me.getUsuario().getNombre() : null,
                            idSucursal),
                    "Listado de OT por rango."));
        }
        if (inicio == null && fin == null) {
            LocalDate hoy = LocalDate.now();
            return ResponseEntity.ok(ApiResponse.of(
                    otService.filtrarListado(
                            otService.listarPorFecha(hoy, idSucursal),
                            idUsuarioFiltro,
                            rolFiltro,
                            pendiente,
                            me != null && me.getUsuario() != null ? me.getUsuario().getNombre() : null,
                            idSucursal),
                    "Listado de OT del dia."));
        }
        throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                "Debe enviar 'fecha' o ambos 'inicio' y 'fin'."
        );
    }

    @GetMapping("/finalizadas")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listarOtFinalizadas(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "fecha", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(value = "usuario", required = false) Integer idUsuario) {
        AuthMeResponse me = resolveSession(token);
        Integer idSucursal = extractIdSucursal(me);
        Integer idUsuarioFiltro = idUsuario;
        if (me != null && me.getUsuario() != null && me.getUsuario().getIdUsuario() != null) {
            idUsuarioFiltro = me.getUsuario().getIdUsuario();
        }
        LocalDate fechaFiltro = fecha != null ? fecha : LocalDate.now();

        return ResponseEntity.ok(ApiResponse.of(
                otService.listarFinalizadasPorTecnico(fechaFiltro, idUsuarioFiltro, idSucursal),
                "Listado de OT finalizadas desde tbl_venta."
        ));
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> obtenerPorId(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "idSucursal", required = false) Integer idSucursal,
            @PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.of(
                otService.obtenerPorId(id, resolveIdSucursal(token, idSucursal)),
                "OT encontrada."
        ));
    }

    @GetMapping("/numero/{numero}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> obtenerPorNumero(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "idSucursal", required = false) Integer idSucursal,
            @PathVariable("numero") @NotBlank String numero) {
        return ResponseEntity.ok(ApiResponse.of(
                otService.obtenerPorNumero(numero, resolveIdSucursal(token, idSucursal)),
                "OT encontrada."
        ));
    }

    @GetMapping("/{id}/instalados")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> obtenerInstalados(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "idSucursal", required = false) Integer idSucursal,
            @PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.of(
                otService.obtenerDetalleInstalado(id, resolveIdSucursal(token, idSucursal)),
                "Detalle instalado."
        ));
    }

    @GetMapping("/{id}/retirados")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> obtenerRetirados(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "idSucursal", required = false) Integer idSucursal,
            @PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.of(
                otService.obtenerDetalleRetirado(id, resolveIdSucursal(token, idSucursal)),
                "Detalle retirado."
        ));
    }

    @GetMapping("/{id}/excedentes")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> obtenerExcedentes(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "idSucursal", required = false) Integer idSucursal,
            @PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.of(
                otService.obtenerDetalleExcedente(id, resolveIdSucursal(token, idSucursal)),
                "Detalle excedente."
        ));
    }

    @GetMapping("/{id}/cargo-usuario")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> obtenerCargoUsuario(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "idSucursal", required = false) Integer idSucursal,
            @PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.of(
                otService.obtenerDetalleCargoUsuario(id, resolveIdSucursal(token, idSucursal)),
                "Detalle cargo usuario."
        ));
    }

    @GetMapping("/{id}/registro-completo")
    public ResponseEntity<ApiResponse<Map<String, Object>>> obtenerRegistroCompleto(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "idSucursal", required = false) Integer idSucursal,
            @PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.of(
                otService.obtenerRegistroCompletoPorIdVenta(id, resolveIdSucursal(token, idSucursal)),
                "Registro completo de venta obtenido correctamente."
        ));
    }

    @GetMapping({"/spx_ObtenerSaldoRuta", "/saldo-ruta"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> obtenerSaldoRuta(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "idRuta", required = false) Integer idRuta,
            @RequestParam(value = "ruta", required = false) Integer ruta,
            @RequestParam(value = "fecha", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(value = "idSucursal", required = false) Integer idSucursal) {
        Integer idRutaFinal = idRuta != null ? idRuta : ruta;
        if (idRutaFinal == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "idRuta o ruta es requerido."
            );
        }
        return ResponseEntity.ok(ApiResponse.of(
                otService.obtenerSaldoRuta(idRutaFinal, fecha, resolveIdSucursal(token, idSucursal)),
                "Saldo de ruta obtenido correctamente."
        ));
    }

    @PutMapping("/{id}/datos")
    public ResponseEntity<ApiResponse<Integer>> modificarDatos(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @PathVariable("id") Long id,
            @Valid @RequestBody OtModificarDatosRequest request) {
        int filas = otService.modificarDatosOt(id, request, resolveIdSucursal(token));
        return ResponseEntity.ok(ApiResponse.of(
                filas,
                "Datos de OT modificados."
        ));
    }

    @PutMapping("/{id}/fecha")
    public ResponseEntity<ApiResponse<OtModificarFechaResponse>> modificarFecha(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @PathVariable("id") Long id,
            @Valid @RequestBody OtModificarFechaRequest request) {
        OtModificarFechaResponse response = otService.modificarFecha(id, request, resolveIdSucursal(token));
        return ResponseEntity.ok(ApiResponse.of(
                response,
                "Fecha de OT modificada."
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> anularOt(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @PathVariable("id") Long id,
            @RequestParam("modo") String modo,
            @RequestParam(value = "usuario", required = false) Integer idUsuario) {
        Integer idSucursal = resolveIdSucursal(token);
        if ("solo_cu".equalsIgnoreCase(modo)) {
            int filas = otService.anularSoloCu(id, idUsuario, idSucursal);
            return ResponseEntity.ok(ApiResponse.of(
                    filas,
                    "Cargo usuario anulado."
            ));
        }
        if ("con_cu".equalsIgnoreCase(modo)) {
            otService.anularConCu(id, idUsuario);
            return ResponseEntity.ok(ApiResponse.of(
                    null,
                    "OT anulada con CU."
            ));
        }
        throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                "modo debe ser con_cu o solo_cu."
        );
    }

    @GetMapping({"/spx_ObtenerCaberaVentaParaRegistroOTwb", "/cabecera-venta/registro-otwb"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> obtenerCabeceraVentaParaRegistroOtWb(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam("clienteNro") Integer clienteNro,
            @RequestParam("ot") Integer ot,
            @RequestParam("tor") @NotBlank String tor,
            @RequestParam("grupo") @NotBlank String grupo,
            @RequestParam("tecnicoNombre") @NotBlank String tecnicoNombre,
            @RequestParam(value = "idSucursal", required = false) Integer idSucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                otService.obtenerCabeceraVentaParaRegistroOtWb(
                        clienteNro,
                        ot,
                        tor,
                        grupo,
                        tecnicoNombre,
                        resolveIdSucursal(token, idSucursal)
                ),
                "Cabecera de venta obtenida correctamente."
        ));
    }

    @GetMapping({"/spx_ValidarVentaYDetallewb", "/venta/validar-detalle"})
    public ResponseEntity<ApiResponse<OtValidarVentaDetalleResponse>> validarVentaYDetalleWb(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam("fecha") String fecha,
            @RequestParam("nroOT") Integer nroOT,
            @RequestParam("numeroCliente") Integer numeroCliente,
            @RequestParam(value = "incluirManual", required = false, defaultValue = "false") boolean incluirManual,
            @RequestParam(value = "desdeAgenda", required = false, defaultValue = "false") boolean desdeAgenda,
            @RequestParam(value = "idSucursal", required = false) Integer idSucursal) {
        return ResponseEntity.ok(ApiResponse.of(
                otService.validarVentaYDetalleWb(
                        fecha,
                        nroOT,
                        numeroCliente,
                        resolveIdSucursal(token, idSucursal),
                        incluirManual,
                        desdeAgenda
                ),
                "Validacion de venta y detalle ejecutada correctamente."
        ));
    }

    @GetMapping({"/spx_ExisteCierreAlmacen", "/validaciones/registro-agenda", "/spx_ValidarRegistroAgenda"})
    public ResponseEntity<ApiResponse<OtRegistroAgendaValidacionResponse>> validarRegistroAgenda(
            @RequestHeader(value = "X-Session-Token", required = false) String token,
            @RequestParam(value = "fecha", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return ResponseEntity.ok(ApiResponse.of(
                otService.validarRegistroAgenda(fecha, resolveIdSucursal(token)),
                "Validacion de registro de agenda ejecutada correctamente."
        ));
    }

    private Integer resolveIdSucursal(String token) {
        return extractIdSucursal(resolveSession(token));
    }

    private Integer resolveIdSucursal(String token, Integer idSucursalFallback) {
        if (idSucursalFallback != null && idSucursalFallback > 0) {
            return idSucursalFallback;
        }
        Integer idSucursalSesion = resolveIdSucursal(token);
        if (idSucursalSesion != null) {
            return idSucursalSesion;
        }
        throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                "Debes enviar X-Session-Token o idSucursal para resolver la base de datos de la sucursal."
        );
    }


    private Integer extractIdSucursal(AuthMeResponse me) {
        if (me == null || me.getUsuario() == null) {
            return null;
        }
        return me.getUsuario().getIdSucursal();
    }

    private AuthMeResponse resolveSession(String token) {
        if (isBlank(token)) {
            return null;
        }
        return authService.me(token);
    }

    private boolean isSesionNoDisponible(ApiException ex) {
        if (ex == null) {
            return false;
        }
        if (ex.getStatus() == HttpStatus.UNAUTHORIZED) {
            return true;
        }
        String code = ex.getCode();
        return code != null && code.startsWith("SESSION_");
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private Map<String, Object> buildDetalleMaterialesSnapshot(OtRegistrarDetalleAgendaRequest request) {
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        if (request == null) {
            out.put("request", null);
            return out;
        }
        out.put("numeroOrden", request.getNumeroOrden());
        out.put("codigoCliente", request.getCodigoCliente());
        out.put("fechaEjecucion", request.getFechaEjecucion());
        out.put("idEstado", request.getIdEstado());
        out.put("observacion", request.getObservacion());
        List<Map<String, Object>> materiales = new java.util.ArrayList<>();
        if (request.getMateriales() != null) {
            for (OtDetalleMaterialRequest item : request.getMateriales()) {
                Map<String, Object> row = new java.util.LinkedHashMap<>();
                if (item != null) {
                    row.put("idProducto", item.getIdProducto());
                    row.put("idTipoMaterial", item.getIdTipoMaterial());
                    row.put("cantidad", item.getCantidad());
                    row.put("serie", item.getSerie());
                    row.put("chipId", item.getChipId());
                    row.put("requiereIdentificacion", item.getRequiereIdentificacion());
                    row.put("entregado", item.getEntregado());
                }
                materiales.add(row);
            }
        }
        out.put("materiales", materiales);
        return out;
    }
}
