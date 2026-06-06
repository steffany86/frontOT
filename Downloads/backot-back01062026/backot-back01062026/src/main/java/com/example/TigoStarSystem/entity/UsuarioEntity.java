package com.example.TigoStarSystem.entity;

import java.time.LocalDateTime;

public class UsuarioEntity {
    private Integer idUsuario;
    private String nombre;
    private String loggin;
    private String password;
    private Integer idRol;
    private Boolean necesitaCambio;
    private LocalDateTime ultimaModificacion;
    private String tipoUsuario;
    private Integer idEmpleado;
    private String codEmpleado;
    private String correo;
    private Boolean eEliminado;

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getLoggin() {
        return loggin;
    }

    public void setLoggin(String loggin) {
        this.loggin = loggin;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Integer getIdRol() {
        return idRol;
    }

    public void setIdRol(Integer idRol) {
        this.idRol = idRol;
    }

    public Boolean getNecesitaCambio() {
        return necesitaCambio;
    }

    public void setNecesitaCambio(Boolean necesitaCambio) {
        this.necesitaCambio = necesitaCambio;
    }

    public LocalDateTime getUltimaModificacion() {
        return ultimaModificacion;
    }

    public void setUltimaModificacion(LocalDateTime ultimaModificacion) {
        this.ultimaModificacion = ultimaModificacion;
    }

    public String getTipoUsuario() {
        return tipoUsuario;
    }

    public void setTipoUsuario(String tipoUsuario) {
        this.tipoUsuario = tipoUsuario;
    }

    public Integer getIdEmpleado() {
        return idEmpleado;
    }

    public void setIdEmpleado(Integer idEmpleado) {
        this.idEmpleado = idEmpleado;
    }

    public String getCodEmpleado() {
        return codEmpleado;
    }

    public void setCodEmpleado(String codEmpleado) {
        this.codEmpleado = codEmpleado;
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public Boolean getEEliminado() {
        return eEliminado;
    }

    public void setEEliminado(Boolean eEliminado) {
        this.eEliminado = eEliminado;
    }
}
