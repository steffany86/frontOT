package com.example.TigoStarSystem.ot.dto;

import java.time.LocalDate;
import java.util.List;

public class OtRegistroAgendaValidacionResponse {
    private final boolean bloqueado;
    private final String codigoBloqueo;
    private final String mensaje;
    private final LocalDate fechaVerificacion;
    private final boolean movimientosEjecutados;
    private final boolean cierreAlmacenBloqueado;
    private final Integer cierreAlmacenCodigo;
    private final String cierreAlmacenMensaje;
    private final boolean cierrePrPdBloqueado;
    private final Integer cierrePrPdCodigo;
    private final String cierrePrPdMensaje;
    private final boolean movimientosBloqueados;
    private final String movimientosMensaje;
    private final List<String> movimientosDetalle;

    public OtRegistroAgendaValidacionResponse(
            boolean bloqueado,
            String codigoBloqueo,
            String mensaje,
            LocalDate fechaVerificacion,
            boolean movimientosEjecutados,
            boolean cierreAlmacenBloqueado,
            Integer cierreAlmacenCodigo,
            String cierreAlmacenMensaje,
            boolean cierrePrPdBloqueado,
            Integer cierrePrPdCodigo,
            String cierrePrPdMensaje,
            boolean movimientosBloqueados,
            String movimientosMensaje,
            List<String> movimientosDetalle) {
        this.bloqueado = bloqueado;
        this.codigoBloqueo = codigoBloqueo;
        this.mensaje = mensaje;
        this.fechaVerificacion = fechaVerificacion;
        this.movimientosEjecutados = movimientosEjecutados;
        this.cierreAlmacenBloqueado = cierreAlmacenBloqueado;
        this.cierreAlmacenCodigo = cierreAlmacenCodigo;
        this.cierreAlmacenMensaje = cierreAlmacenMensaje;
        this.cierrePrPdBloqueado = cierrePrPdBloqueado;
        this.cierrePrPdCodigo = cierrePrPdCodigo;
        this.cierrePrPdMensaje = cierrePrPdMensaje;
        this.movimientosBloqueados = movimientosBloqueados;
        this.movimientosMensaje = movimientosMensaje;
        this.movimientosDetalle = movimientosDetalle;
    }

    public boolean isBloqueado() {
        return bloqueado;
    }

    public String getCodigoBloqueo() {
        return codigoBloqueo;
    }

    public String getMensaje() {
        return mensaje;
    }

    public LocalDate getFechaVerificacion() {
        return fechaVerificacion;
    }

    public boolean isMovimientosEjecutados() {
        return movimientosEjecutados;
    }

    public boolean isCierreAlmacenBloqueado() {
        return cierreAlmacenBloqueado;
    }

    public Integer getCierreAlmacenCodigo() {
        return cierreAlmacenCodigo;
    }

    public String getCierreAlmacenMensaje() {
        return cierreAlmacenMensaje;
    }

    public boolean isCierrePrPdBloqueado() {
        return cierrePrPdBloqueado;
    }

    public Integer getCierrePrPdCodigo() {
        return cierrePrPdCodigo;
    }

    public String getCierrePrPdMensaje() {
        return cierrePrPdMensaje;
    }

    public boolean isMovimientosBloqueados() {
        return movimientosBloqueados;
    }

    public String getMovimientosMensaje() {
        return movimientosMensaje;
    }

    public List<String> getMovimientosDetalle() {
        return movimientosDetalle;
    }
}
