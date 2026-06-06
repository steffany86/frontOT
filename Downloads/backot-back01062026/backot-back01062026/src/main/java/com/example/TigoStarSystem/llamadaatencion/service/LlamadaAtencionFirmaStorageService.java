package com.example.TigoStarSystem.llamadaatencion.service;

import com.example.TigoStarSystem.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;

@Service
public class LlamadaAtencionFirmaStorageService {
    private static final DateTimeFormatter DATE_PARTITION = DateTimeFormatter.ofPattern("yyyy/MM/dd");
    private static final DateTimeFormatter FILE_TS = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss_SSS");
    private final Path baseDir;

    public LlamadaAtencionFirmaStorageService(
            @Value("${app.llamada-atencion.firmas.dir:C:/imagenes_cuadrillas}") String baseDirRaw) {
        String resolved = baseDirRaw == null || baseDirRaw.trim().isEmpty()
                ? "C:/imagenes_cuadrillas"
                : baseDirRaw.trim();
        this.baseDir = Paths.get(resolved).toAbsolutePath().normalize();
        ensureDirectory(this.baseDir);
    }

    public String guardarFirmaTecnico(String firmaRaw) {
        return guardarFirma(firmaRaw, "firma_tecnico");
    }

    public String guardarFirmaTestigo(String firmaRaw) {
        return guardarFirma(firmaRaw, "firma_testigo");
    }

    public FirmaFile cargarFirma(String firmaPathRaw) {
        String firmaPath = trimToNull(firmaPathRaw);
        if (firmaPath == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "Ruta de firma requerida."
            );
        }

        String normalizedRelative = firmaPath.replace("\\", "/");
        while (normalizedRelative.startsWith("/")) {
            normalizedRelative = normalizedRelative.substring(1);
        }

        Path resolved = baseDir.resolve(normalizedRelative).normalize();
        if (!resolved.startsWith(baseDir)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "Ruta de firma invalida."
            );
        }

        if (!Files.exists(resolved) || !Files.isRegularFile(resolved)) {
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    "NOT_FOUND",
                    "Archivo de firma no encontrado."
            );
        }

        byte[] content;
        try {
            content = Files.readAllBytes(resolved);
        } catch (IOException ex) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "FIRMA_STORAGE_ERROR",
                    "No se pudo leer la imagen de firma."
            );
        }

        return new FirmaFile(content, resolveContentType(resolved));
    }

    private String guardarFirma(String firmaRaw, String prefijo) {
        String value = trimToNull(firmaRaw);
        if (value == null) {
            return null;
        }
        if (!isDataImageBase64(value)) {
            return value;
        }

        DecodedImage decoded = decodeDataUrl(value);
        LocalDateTime now = LocalDateTime.now();
        String datePath = DATE_PARTITION.format(LocalDate.now());
        String fileTs = FILE_TS.format(now);
        String fileName = prefijo + "_" + fileTs + "_" + UUID.randomUUID().toString().substring(0, 8) + "." + decoded.extension;
        Path targetDir = baseDir.resolve(prefijo).resolve(datePath);
        ensureDirectory(targetDir);

        Path filePath = targetDir.resolve(fileName);
        try {
            Files.write(filePath, decoded.bytes);
        } catch (IOException ex) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "FIRMA_STORAGE_ERROR",
                    "No se pudo guardar la imagen de firma en disco."
            );
        }

        return prefijo + "/" + datePath + "/" + fileName;
    }

    private boolean isDataImageBase64(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        return lower.startsWith("data:image/") && lower.contains(";base64,");
    }

    private DecodedImage decodeDataUrl(String value) {
        int base64Index = value.indexOf(";base64,");
        if (base64Index <= 0 || base64Index + 8 >= value.length()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "Formato de firma invalido. Se esperaba data:image/*;base64,..."
            );
        }

        String mimePart = value.substring(5, base64Index).trim().toLowerCase(Locale.ROOT);
        String base64Part = value.substring(base64Index + 8).trim();
        if (base64Part.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "La firma no contiene contenido base64."
            );
        }

        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(base64Part);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "La firma enviada no es base64 valido."
            );
        }

        String extension = resolveExtension(mimePart);
        return new DecodedImage(bytes, extension);
    }

    private String resolveExtension(String mimeType) {
        if (mimeType == null) {
            return "png";
        }
        switch (mimeType) {
            case "image/png":
                return "png";
            case "image/jpeg":
            case "image/jpg":
                return "jpg";
            case "image/webp":
                return "webp";
            default:
                return "png";
        }
    }

    private void ensureDirectory(Path dir) {
        try {
            Files.createDirectories(dir);
        } catch (IOException ex) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "FIRMA_STORAGE_DIR_ERROR",
                    "No se pudo crear/validar carpeta de firmas: " + dir
            );
        }
    }

    private String resolveContentType(Path path) {
        String name = path == null ? "" : path.getFileName().toString().toLowerCase(Locale.ROOT);
        if (name.endsWith(".png")) {
            return "image/png";
        }
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (name.endsWith(".webp")) {
            return "image/webp";
        }
        return "application/octet-stream";
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static final class DecodedImage {
        private final byte[] bytes;
        private final String extension;

        private DecodedImage(byte[] bytes, String extension) {
            this.bytes = bytes;
            this.extension = extension;
        }
    }

    public static final class FirmaFile {
        private final byte[] content;
        private final String contentType;

        public FirmaFile(byte[] content, String contentType) {
            this.content = content;
            this.contentType = contentType;
        }

        public byte[] getContent() {
            return content;
        }

        public String getContentType() {
            return contentType;
        }
    }
}
