package com.example.TigoStarSystem.ot.dto;

import javax.validation.constraints.NotNull;

import java.time.LocalDate;

public class OtModificarFechaRequest {
    @NotNull(message = "fechaVieja es requerida")
    private LocalDate fechaVieja;

    @NotNull(message = "fechaNueva es requerida")
    private LocalDate fechaNueva;

    @NotNull(message = "idRuta es requerido")
    private Integer idRuta;

    @NotNull(message = "idUsuario es requerido")
    private Integer idUsuario;

    public LocalDate getFechaVieja() {
        return fechaVieja;
    }

    public void setFechaVieja(LocalDate fechaVieja) {
        this.fechaVieja = fechaVieja;
    }

    public LocalDate getFechaNueva() {
        return fechaNueva;
    }

    public void setFechaNueva(LocalDate fechaNueva) {
        this.fechaNueva = fechaNueva;
    }

    public Integer getIdRuta() {
        return idRuta;
    }

    public void setIdRuta(Integer idRuta) {
        this.idRuta = idRuta;
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }
}

