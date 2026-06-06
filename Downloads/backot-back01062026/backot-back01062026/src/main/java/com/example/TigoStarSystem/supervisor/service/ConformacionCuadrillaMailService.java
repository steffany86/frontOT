package com.example.TigoStarSystem.supervisor.service;

import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaRowRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import javax.mail.internet.MimeMessage;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class ConformacionCuadrillaMailService {
    private static final Logger logger = LoggerFactory.getLogger(ConformacionCuadrillaMailService.class);
    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final JavaMailSender mailSender;
    private final boolean enabled;
    private final String destinatario;
    private final String remitente;

    /**
     * Inicializa servicio de correo para notificacion de cuadrillas.
     */
    public ConformacionCuadrillaMailService(
            JavaMailSender mailSender,
            @Value("${app.cuadrilla.mail.enabled:false}") boolean enabled,
            @Value("${app.cuadrilla.mail.to:}") String destinatario,
            @Value("${app.cuadrilla.mail.from:}") String remitente) {
        this.mailSender = mailSender;
        this.enabled = enabled;
        this.destinatario = destinatario;
        this.remitente = remitente;
    }

    /**
     * Envia correo con resumen de cuadrillas confirmadas y pendientes.
     */
    public void enviarDetalleCuadrillasNoConfirmadas(
            List<Map<String, Object>> cuadrillasDisponibles,
            List<ConformacionCuadrillaRowRequest> filasConfirmadas) {
        if (!enabled || isBlank(destinatario) || isBlank(remitente)) {
            logger.info(
                    "Correo cuadrillas omitido. enabled={}, toConfigured={}, fromConfigured={}",
                    enabled,
                    !isBlank(destinatario),
                    !isBlank(remitente)
            );
            return;
        }
        if (cuadrillasDisponibles == null || cuadrillasDisponibles.isEmpty()) {
            logger.info("Correo cuadrillas omitido. No hay cuadrillas disponibles para comparar.");
            return;
        }

        Set<String> confirmadas = new HashSet<>();
        String sucursal = null;
        LocalDate fecha = null;

        if (filasConfirmadas != null) {
            for (ConformacionCuadrillaRowRequest fila : filasConfirmadas) {
                if (fila == null) {
                    continue;
                }
                String grupo = normalize(fila.getGrupo());
                if (!grupo.isEmpty()) {
                    confirmadas.add(grupo);
                }
                if (isBlank(sucursal) && !isBlank(fila.getSucursal())) {
                    sucursal = fila.getSucursal().trim();
                }
                if (fecha == null && fila.getFecha() != null) {
                    fecha = fila.getFecha();
                }
            }
        }

        List<ConformacionCuadrillaPendiente> noConfirmadas = new ArrayList<>();
        int pendientesSinNombreTecnico = 0;
        Map<String, Object> ejemploPendienteSinNombre = null;
        for (Map<String, Object> row : cuadrillasDisponibles) {
            if (!esNoEliminada(row)) {
                continue;
            }
            String grupo = resolveString(row, "grupo", "nombre", "ruta", "cuadrilla");
            if (isBlank(grupo)) {
                continue;
            }
            String grupoKey = normalize(grupo);
            if (confirmadas.contains(grupoKey)) {
                continue;
            }
            String tecnico = resolveTecnicoPendiente(row, grupo);
            String idTecnico = resolveString(row, "id_tecnico", "idtecnico", "id_vendedor", "idvendedor");
            String vehiculo = resolveString(row, "vehiculo", "placa", "placavehiculo", "placa_vehiculo");
            if (isBlank(tecnico) && !isBlank(idTecnico)) {
                pendientesSinNombreTecnico++;
                if (ejemploPendienteSinNombre == null) {
                    ejemploPendienteSinNombre = row;
                }
            }
            noConfirmadas.add(new ConformacionCuadrillaPendiente(grupo.trim(), tecnico, idTecnico, vehiculo));
        }
        if (pendientesSinNombreTecnico > 0) {
            logger.warn(
                    "Pendientes sin nombre de tecnico: {}. Ejemplo de columnas disponibles: {}",
                    pendientesSinNombreTecnico,
                    ejemploPendienteSinNombre == null ? "[]" : ejemploPendienteSinNombre.keySet()
            );
        }

        String asunto = "Detalle de cuadrillas no confirmadas"
                + (fecha == null ? "" : " - " + fecha)
                + (isBlank(sucursal) ? "" : " - " + sucursal);
        String htmlBody = buildHtmlCorreo(fecha, sucursal, filasConfirmadas, noConfirmadas);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(remitente);
            helper.setTo(destinatario);
            helper.setSubject(asunto);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            logger.info("Correo de cuadrillas no confirmadas enviado a {} con {} items.", destinatario, noConfirmadas.size());
        } catch (Exception ex) {
            logger.error("No se pudo enviar correo de cuadrillas no confirmadas.", ex);
        }
    }

    /**
     * Construye HTML del correo con tablas de confirmadas y pendientes.
     */
    private String buildHtmlCorreo(
            LocalDate fecha,
            String sucursal,
            List<ConformacionCuadrillaRowRequest> filasConfirmadas,
            List<ConformacionCuadrillaPendiente> noConfirmadas) {
        List<ConformacionCuadrillaRowRequest> confirmadas = new ArrayList<>();
        if (filasConfirmadas != null) {
            for (ConformacionCuadrillaRowRequest fila : filasConfirmadas) {
                if (fila != null) {
                    confirmadas.add(fila);
                }
            }
        }

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>");
        html.append("<html><head><meta charset='UTF-8'></head><body style='margin:0;background:#f4f7fb;'>");
        html.append("<div style='max-width:1100px;margin:0 auto;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;'>");
        html.append("<div style='background:#0f172a;color:#ffffff;padding:16px 20px;border-radius:10px 10px 0 0;'>");
        html.append("<h2 style='margin:0;font-size:20px;'>Resumen de conformacion de cuadrillas</h2>");
        html.append("<p style='margin:6px 0 0 0;font-size:12px;opacity:0.9;'>Generado: ")
                .append(escapeHtml(DATE_TIME_FORMAT.format(LocalDateTime.now())))
                .append("</p>");
        html.append("</div>");
        html.append("<div style='background:#ffffff;border:1px solid #dbe3ef;border-top:0;border-radius:0 0 10px 10px;padding:16px;'>");
        html.append("<table style='width:100%;border-collapse:collapse;margin-bottom:14px;'>");
        html.append("<tr>");
        appendSummaryCell(html, "Fecha", fecha == null ? "-" : fecha.toString());
        appendSummaryCell(html, "Sucursal", isBlank(sucursal) ? "-" : sucursal.trim());
        appendSummaryCell(html, "Total confirmadas", String.valueOf(confirmadas.size()));
        appendSummaryCell(html, "Total pendientes", String.valueOf(noConfirmadas.size()));
        html.append("</tr></table>");

        html.append("<h3 style='margin:18px 0 8px 0;font-size:15px;color:#0b5394;'>Cuadrillas confirmadas</h3>");
        if (confirmadas.isEmpty()) {
            html.append("<div style='padding:10px;border:1px solid #cfe2f3;background:#eef6ff;border-radius:6px;font-size:13px;'>")
                    .append("No se registraron cuadrillas confirmadas en este envio.")
                    .append("</div>");
        } else {
            appendConfirmadasTable(html, confirmadas);
        }

        html.append("<h3 style='margin:20px 0 8px 0;font-size:15px;color:#b54708;'>Cuadrillas pendientes</h3>");
        if (noConfirmadas.isEmpty()) {
            html.append("<div style='padding:10px;border:1px solid #b7eb8f;background:#f6ffed;border-radius:6px;font-size:13px;'>")
                    .append("Todas las cuadrillas disponibles ya fueron confirmadas.")
                    .append("</div>");
        } else {
            appendPendientesTable(html, noConfirmadas);
        }
        html.append("</div></div></body></html>");
        return html.toString();
    }

    /**
     * Agrega tabla HTML de cuadrillas confirmadas.
     */
    private void appendConfirmadasTable(StringBuilder html, List<ConformacionCuadrillaRowRequest> confirmadas) {
        html.append("<table style='width:100%;border-collapse:collapse;font-size:12px;'>");
        html.append("<tr style='background:#d9e2f3;'>");
        appendHeaderCell(html, "Grupo");
        appendHeaderCell(html, "Tecnico");
        appendHeaderCell(html, "IdTecnico");
        appendHeaderCell(html, "Auxiliar");
        appendHeaderCell(html, "Vehiculo");
        appendHeaderCell(html, "Actividad");
        appendHeaderCell(html, "Estado");
        appendHeaderCell(html, "Supervisor");
        appendHeaderCell(html, "Digitador");
        appendHeaderCell(html, "Observacion");
        html.append("</tr>");
        for (int i = 0; i < confirmadas.size(); i++) {
            ConformacionCuadrillaRowRequest fila = confirmadas.get(i);
            String rowColor = (i % 2 == 0) ? "#ffffff" : "#f8fbff";
            html.append("<tr style='background:").append(rowColor).append(";'>");
            appendDataCell(html, fila.getGrupo());
            appendDataCell(html, fila.getTecnico());
            appendDataCell(html, fila.getIdTecnico() == null ? null : String.valueOf(fila.getIdTecnico()));
            appendDataCell(html, fila.getAuxiliar());
            appendDataCell(html, fila.getVehiculo());
            appendDataCell(html, fila.getActividad());
            appendDataCell(html, fila.getEstado());
            appendDataCell(html, fila.getSupervisorACargo());
            appendDataCell(html, fila.getDigitador());
            appendDataCell(html, fila.getObservacion());
            html.append("</tr>");
        }
        html.append("</table>");
    }

    /**
     * Agrega tabla HTML de cuadrillas pendientes.
     */
    private void appendPendientesTable(StringBuilder html, List<ConformacionCuadrillaPendiente> noConfirmadas) {
        html.append("<table style='width:100%;border-collapse:collapse;font-size:12px;'>");
        html.append("<tr style='background:#fdecc8;'>");
        appendHeaderCell(html, "Grupo");
        appendHeaderCell(html, "Tecnico");
        appendHeaderCell(html, "IdTecnico");
        appendHeaderCell(html, "Vehiculo");
        html.append("</tr>");
        for (int i = 0; i < noConfirmadas.size(); i++) {
            ConformacionCuadrillaPendiente fila = noConfirmadas.get(i);
            String rowColor = (i % 2 == 0) ? "#ffffff" : "#fffcf5";
            html.append("<tr style='background:").append(rowColor).append(";'>");
            appendDataCell(html, fila.grupo);
            appendDataCell(html, fila.tecnico);
            appendDataCell(html, fila.idTecnico);
            appendDataCell(html, fila.vehiculo);
            html.append("</tr>");
        }
        html.append("</table>");
    }

    /**
     * Agrega celda de resumen (label + valor) en cabecera del correo.
     */
    private void appendSummaryCell(StringBuilder html, String label, String value) {
        html.append("<td style='border:1px solid #dbe3ef;padding:8px 10px;width:25%;vertical-align:top;'>");
        html.append("<div style='font-size:11px;color:#4b5563;'>").append(escapeHtml(label)).append("</div>");
        html.append("<div style='font-size:14px;font-weight:600;color:#111827;'>").append(escapeHtml(value)).append("</div>");
        html.append("</td>");
    }

    /**
     * Agrega celda de cabecera de tabla.
     */
    private void appendHeaderCell(StringBuilder html, String value) {
        html.append("<th style='border:1px solid #c7d2e5;padding:7px 8px;text-align:left;font-weight:700;'>");
        html.append(escapeHtml(value));
        html.append("</th>");
    }

    /**
     * Agrega celda de datos de tabla.
     */
    private void appendDataCell(StringBuilder html, String value) {
        html.append("<td style='border:1px solid #dbe3ef;padding:7px 8px;vertical-align:top;'>");
        html.append(escapeHtml(value));
        html.append("</td>");
    }

    /**
     * Escapa caracteres peligrosos para render seguro en HTML.
     */
    private String escapeHtml(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "-";
        }
        String escaped = value;
        escaped = escaped.replace("&", "&amp;");
        escaped = escaped.replace("<", "&lt;");
        escaped = escaped.replace(">", "&gt;");
        escaped = escaped.replace("\"", "&quot;");
        escaped = escaped.replace("'", "&#39;");
        return escaped;
    }

    /**
     * Resuelve nombre de tecnico evitando duplicar el nombre de grupo.
     */
    private String resolveTecnicoPendiente(Map<String, Object> row, String grupo) {
        String tecnico = resolveString(
                row,
                "nombrevendedor",
                "nombre_vendedor",
                "tecnico",
                "tecnico_nombre",
                "nombretecnico",
                "vendedor",
                "nombres",
                "nombre_completo"
        );
        if (!isBlank(tecnico) && !isSameLabel(tecnico, grupo)) {
            return tecnico;
        }
        String nombre = resolveString(row, "nombre");
        if (!isBlank(nombre) && !isSameLabel(nombre, grupo)) {
            return nombre;
        }
        return null;
    }

    /**
     * Obtiene primer string no vacio entre varias claves candidatas.
     */
    private String resolveString(Map<String, Object> row, String... keys) {
        if (row == null || keys == null) {
            return null;
        }
        for (String key : keys) {
            Object value = getCaseInsensitive(row, key);
            if (value == null) {
                continue;
            }
            String text = value.toString().trim();
            if (!text.isEmpty()) {
                return text;
            }
        }
        return null;
    }

    /**
     * Busca valor por clave ignorando mayusculas y separadores.
     */
    private Object getCaseInsensitive(Map<String, Object> row, String targetKey) {
        String normalizedTarget = normalize(targetKey);
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            if (normalize(entry.getKey()).equals(normalizedTarget)) {
                return entry.getValue();
            }
        }
        return null;
    }

    /**
     * Normaliza texto para comparaciones de etiquetas.
     */
    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("[^a-zA-Z0-9]", "").trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Compara dos etiquetas despues de normalizarlas.
     */
    private boolean isSameLabel(String left, String right) {
        if (isBlank(left) || isBlank(right)) {
            return false;
        }
        return normalize(left).equals(normalize(right));
    }

    /**
     * Evalua si un texto esta vacio.
     */
    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    /**
     * Determina si la fila no esta marcada como eliminada.
     */
    private boolean esNoEliminada(Map<String, Object> row) {
        Object value = getCaseInsensitive(row, "e_eliminado");
        if (value == null) {
            value = getCaseInsensitive(row, "E_Eliminado");
        }
        if (value == null) {
            value = getCaseInsensitive(row, "eliminado");
        }
        if (value == null) {
            value = getCaseInsensitive(row, "Eliminado");
        }
        if (value == null) {
            return true;
        }
        if (value instanceof Boolean) {
            return !((Boolean) value);
        }
        if (value instanceof Number) {
            return ((Number) value).intValue() == 0;
        }
        String text = value.toString().trim().toLowerCase(Locale.ROOT);
        return "0".equals(text) || "false".equals(text) || "n".equals(text) || "no".equals(text);
    }

    /**
     * DTO interno para representar una cuadrilla pendiente en el correo.
     */
    private static final class ConformacionCuadrillaPendiente {
        private final String grupo;
        private final String tecnico;
        private final String idTecnico;
        private final String vehiculo;

        /**
         * Crea item pendiente para tabla de correo.
         */
        private ConformacionCuadrillaPendiente(String grupo, String tecnico, String idTecnico, String vehiculo) {
            this.grupo = grupo;
            this.tecnico = tecnico;
            this.idTecnico = idTecnico;
            this.vehiculo = vehiculo;
        }
    }
}
