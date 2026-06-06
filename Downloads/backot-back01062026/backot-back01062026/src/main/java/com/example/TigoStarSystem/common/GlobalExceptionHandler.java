package com.example.TigoStarSystem.common;

import javax.servlet.http.HttpServletRequest;
import javax.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleApiException(ApiException ex, HttpServletRequest request) {
        ApiError error = new ApiError(
                ex.getCode(),
                ex.getMessage(),
                ex.getDetails(),
                OffsetDateTime.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(ex.getStatus()).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, Object> details = new HashMap<>();
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }
        details.put("fields", fieldErrors);

        ApiError apiError = new ApiError(
                "VALIDATION_ERROR",
                "La solicitud contiene campos invÃ¡lidos.",
                details,
                OffsetDateTime.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(apiError);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        Map<String, Object> details = new HashMap<>();
        details.put("violations", ex.getMessage());
        ApiError apiError = new ApiError(
                "VALIDATION_ERROR",
                "ParÃ¡metros invÃ¡lidos.",
                details,
                OffsetDateTime.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(apiError);
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ApiError> handleDataAccess(DataAccessException ex, HttpServletRequest request) {
        logger.error("Database error on {} {}", request.getMethod(), request.getRequestURI(), ex);
        Map<String, Object> details = new HashMap<>();
        Throwable root = ex.getMostSpecificCause();
        details.put("rootCause", root == null ? ex.getMessage() : root.getMessage());
        ApiError apiError = new ApiError(
                "DATABASE_ERROR",
                "Error en base de datos.",
                details,
                OffsetDateTime.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(apiError);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex, HttpServletRequest request) {
        logger.error("Unhandled error on {} {}", request.getMethod(), request.getRequestURI(), ex);
        Map<String, Object> details = new HashMap<>();
        details.put("exception", ex.getClass().getSimpleName());
        Throwable root = ex.getCause();
        while (root != null && root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        if (root != null) {
            details.put("rootCause", root.getMessage() == null ? root.getClass().getSimpleName() : root.getMessage());
        }
        ApiError apiError = new ApiError(
                "INTERNAL_ERROR",
                "Error inesperado.",
                details,
                OffsetDateTime.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(apiError);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiError> handleMaxUploadSize(MaxUploadSizeExceededException ex, HttpServletRequest request) {
        Map<String, Object> details = new HashMap<>();
        details.put("exception", ex.getClass().getSimpleName());
        details.put("maxSize", "10MB");
        ApiError apiError = new ApiError(
                "FILE_TOO_LARGE",
                "El archivo PDF supera el limite permitido (10 MB). Reduce el tamaño del archivo e intenta nuevamente.",
                details,
                OffsetDateTime.now(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(apiError);
    }
}
