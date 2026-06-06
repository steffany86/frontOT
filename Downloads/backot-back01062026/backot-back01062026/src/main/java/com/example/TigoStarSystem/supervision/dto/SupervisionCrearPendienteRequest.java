package com.example.TigoStarSystem.supervision.dto;

import javax.validation.constraints.NotBlank;

public class SupervisionCrearPendienteRequest {
    @NotBlank(message = "idSupervisorAsignado es requerido")
    private String idSupervisorAsignado;

    @NotBlank(message = "idTecnicoPrincipal es requerido")
    private String idTecnicoPrincipal;

    @NotBlank(message = "idTecnicoAuxiliar es requerido")
    private String idTecnicoAuxiliar;

    @NotBlank(message = "idTipoSupervision es requerido")
    private String idTipoSupervision;

    @NotBlank(message = "idTipoTrabajo es requerido")
    private String idTipoTrabajo;

    @NotBlank(message = "idTipoPenalizacion es requerido")
    private String idTipoPenalizacion;

    @NotBlank(message = "supervisionPor es requerido")
    private String supervisionPor;

    @NotBlank(message = "tecnologia es requerido")
    private String tecnologia;

    @NotBlank(message = "codigo es requerido")
    private String codigo;

    @NotBlank(message = "ordenTrabajo es requerido")
    private String ordenTrabajo;

    @NotBlank(message = "tipoRevision es requerido")
    private String tipoRevision;

    @NotBlank(message = "ubicacion es requerido")
    private String ubicacion;

    private String observacion;
    private String descripcionAdicionalObservacion;
    private String fotoBoletaSupervision;
    private String fotoCanalesPilos;
    private String fotoNivelesDocsis;
    private String fotoMedicionRuido;
    private String fotoBarridoCanales;
    private String fotoObservacion1;
    private String fotoObservacion2;
    private String fotoObservacion3;
    private String fotoObservacion4;

    // Getters y Setters
    public String getIdSupervisorAsignado() {
        return idSupervisorAsignado;
    }

    public void setIdSupervisorAsignado(String idSupervisorAsignado) {
        this.idSupervisorAsignado = idSupervisorAsignado;
    }

    public String getIdTecnicoPrincipal() {
        return idTecnicoPrincipal;
    }

    public void setIdTecnicoPrincipal(String idTecnicoPrincipal) {
        this.idTecnicoPrincipal = idTecnicoPrincipal;
    }

    public String getIdTecnicoAuxiliar() {
        return idTecnicoAuxiliar;
    }

    public void setIdTecnicoAuxiliar(String idTecnicoAuxiliar) {
        this.idTecnicoAuxiliar = idTecnicoAuxiliar;
    }

    public String getIdTipoSupervision() {
        return idTipoSupervision;
    }

    public void setIdTipoSupervision(String idTipoSupervision) {
        this.idTipoSupervision = idTipoSupervision;
    }

    public String getIdTipoTrabajo() {
        return idTipoTrabajo;
    }

    public void setIdTipoTrabajo(String idTipoTrabajo) {
        this.idTipoTrabajo = idTipoTrabajo;
    }

    public String getIdTipoPenalizacion() {
        return idTipoPenalizacion;
    }

    public void setIdTipoPenalizacion(String idTipoPenalizacion) {
        this.idTipoPenalizacion = idTipoPenalizacion;
    }

    public String getSupervisionPor() {
        return supervisionPor;
    }

    public void setSupervisionPor(String supervisionPor) {
        this.supervisionPor = supervisionPor;
    }

    public String getTecnologia() {
        return tecnologia;
    }

    public void setTecnologia(String tecnologia) {
        this.tecnologia = tecnologia;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }

    public String getOrdenTrabajo() {
        return ordenTrabajo;
    }

    public void setOrdenTrabajo(String ordenTrabajo) {
        this.ordenTrabajo = ordenTrabajo;
    }

    public String getTipoRevision() {
        return tipoRevision;
    }

    public void setTipoRevision(String tipoRevision) {
        this.tipoRevision = tipoRevision;
    }

    public String getUbicacion() {
        return ubicacion;
    }

    public void setUbicacion(String ubicacion) {
        this.ubicacion = ubicacion;
    }

    public String getObservacion() {
        return observacion;
    }

    public void setObservacion(String observacion) {
        this.observacion = observacion;
    }

    public String getDescripcionAdicionalObservacion() {
        return descripcionAdicionalObservacion;
    }

    public void setDescripcionAdicionalObservacion(String descripcionAdicionalObservacion) {
        this.descripcionAdicionalObservacion = descripcionAdicionalObservacion;
    }

    public String getFotoBoletaSupervision() {
        return fotoBoletaSupervision;
    }

    public void setFotoBoletaSupervision(String fotoBoletaSupervision) {
        this.fotoBoletaSupervision = fotoBoletaSupervision;
    }

    public String getFotoCanalesPilos() {
        return fotoCanalesPilos;
    }

    public void setFotoCanalesPilos(String fotoCanalesPilos) {
        this.fotoCanalesPilos = fotoCanalesPilos;
    }

    public String getFotoNivelesDocsis() {
        return fotoNivelesDocsis;
    }

    public void setFotoNivelesDocsis(String fotoNivelesDocsis) {
        this.fotoNivelesDocsis = fotoNivelesDocsis;
    }

    public String getFotoMedicionRuido() {
        return fotoMedicionRuido;
    }

    public void setFotoMedicionRuido(String fotoMedicionRuido) {
        this.fotoMedicionRuido = fotoMedicionRuido;
    }

    public String getFotoBarridoCanales() {
        return fotoBarridoCanales;
    }

    public void setFotoBarridoCanales(String fotoBarridoCanales) {
        this.fotoBarridoCanales = fotoBarridoCanales;
    }

    public String getFotoObservacion1() {
        return fotoObservacion1;
    }

    public void setFotoObservacion1(String fotoObservacion1) {
        this.fotoObservacion1 = fotoObservacion1;
    }

    public String getFotoObservacion2() {
        return fotoObservacion2;
    }

    public void setFotoObservacion2(String fotoObservacion2) {
        this.fotoObservacion2 = fotoObservacion2;
    }

    public String getFotoObservacion3() {
        return fotoObservacion3;
    }

    public void setFotoObservacion3(String fotoObservacion3) {
        this.fotoObservacion3 = fotoObservacion3;
    }

    public String getFotoObservacion4() {
        return fotoObservacion4;
    }

    public void setFotoObservacion4(String fotoObservacion4) {
        this.fotoObservacion4 = fotoObservacion4;
    }
}
