package com.example.TigoStarSystem.ot.service;

import com.example.TigoStarSystem.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class OtVentaPdfStorageService {
    private static final long MAX_BYTES = 10L * 1024L * 1024L;
    private static final DateTimeFormatter DATE_PARTITION = DateTimeFormatter.ofPattern("yyyy/MM/dd");
    private final Path baseDir;

    public OtVentaPdfStorageService(
            @Value("${app.ot.venta.pdf.dir:C:/archivos_ot_pdf}") String baseDirRaw) {
        String resolved = baseDirRaw == null || baseDirRaw.trim().isEmpty()
                ? "C:/archivos_ot_pdf"
                : baseDirRaw.trim();
        this.baseDir = Paths.get(resolved).toAbsolutePath().normalize();
        ensureDirectory(this.baseDir);
    }

    public String guardarPdfVenta(MultipartFile pdf, Integer ordenTrabajo, Integer codigoCliente, String sucursalNombre) {
        if (pdf == null || pdf.isEmpty()) {
            return null;
        }
        validarPdf(pdf);

        String sucursalFolder = sanitizeFolderName(sucursalNombre);
        String datePath = DATE_PARTITION.format(LocalDate.now());
        Path targetDir = baseDir.resolve("venta").resolve(sucursalFolder).resolve(datePath);
        ensureDirectory(targetDir);

        String fileName = buildFileName(pdf, ordenTrabajo, codigoCliente);
        Path targetPath = targetDir.resolve(fileName);
        try {
            Files.copy(pdf.getInputStream(), targetPath);
        } catch (IOException ex) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "PDF_STORAGE_ERROR",
                    "No se pudo guardar el PDF en disco."
            );
        }
        return targetPath.toAbsolutePath().normalize().toString();
    }

    private void validarPdf(MultipartFile pdf) {
        String originalName = pdf.getOriginalFilename() == null ? "" : pdf.getOriginalFilename().trim().toLowerCase(Locale.ROOT);
        boolean extensionOk = originalName.endsWith(".pdf");
        if (!extensionOk) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "El archivo adjunto debe ser un PDF.");
        }
        long size = pdf.getSize();
        if (size <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "El archivo PDF esta vacio.");
        }
        if (size > MAX_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "El PDF supera el limite de 10MB.");
        }
        if (!tieneFirmaPdf(pdf)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "El archivo no corresponde a un PDF valido.");
        }
    }

    private boolean tieneFirmaPdf(MultipartFile pdf) {
        byte[] signature = new byte[] {0x25, 0x50, 0x44, 0x46, 0x2D}; // %PDF-
        byte[] buffer = new byte[signature.length];
        try (InputStream inputStream = pdf.getInputStream()) {
            int read = inputStream.read(buffer);
            if (read < signature.length) {
                return false;
            }
            for (int i = 0; i < signature.length; i++) {
                if (buffer[i] != signature[i]) {
                    return false;
                }
            }
            return true;
        } catch (IOException ex) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "No se pudo validar el contenido del PDF."
            );
        }
    }

    private String buildFileName(MultipartFile pdf, Integer ordenTrabajo, Integer codigoCliente) {
        String originalName = pdf.getOriginalFilename();
        if (originalName == null || originalName.trim().isEmpty()) {
            String ot = ordenTrabajo == null ? "0" : String.valueOf(Math.max(ordenTrabajo, 0));
            String cliente = codigoCliente == null ? "0" : String.valueOf(Math.max(codigoCliente, 0));
            return "OT_" + ot + "_COD_" + cliente + ".pdf";
        }

        String cleanName = Paths.get(originalName.trim()).getFileName().toString();
        cleanName = cleanName.replaceAll("[\\\\/:*?\"<>|]", "_");
        if (!cleanName.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            cleanName = cleanName + ".pdf";
        }
        return cleanName;
    }

    private void ensureDirectory(Path dir) {
        try {
            Files.createDirectories(dir);
        } catch (IOException ex) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "PDF_STORAGE_DIR_ERROR",
                    "No se pudo crear/validar carpeta de PDFs: " + dir
            );
        }
    }

    private String sanitizeFolderName(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "SinSucursal";
        }
        String cleaned = value.trim().replaceAll("[\\\\/:*?\"<>|]", " ");
        cleaned = cleaned.replaceAll("\\s+", " ").trim();
        if (cleaned.isEmpty()) {
            return "SinSucursal";
        }
        return cleaned;
    }
}
