package com.example.TigoStarSystem.common;

import java.time.OffsetDateTime;
import java.util.Map;

public class ApiError {
    private final String code;
    private final String message;
    private final Map<String, Object> details;
    private final OffsetDateTime timestamp;
    private final String path;

    public ApiError(String code, String message, Map<String, Object> details, OffsetDateTime timestamp, String path) {
        this.code = code;
        this.message = message;
        this.details = details;
        this.timestamp = timestamp;
        this.path = path;
    }

    public String getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public Map<String, Object> getDetails() {
        return details;
    }

    public OffsetDateTime getTimestamp() {
        return timestamp;
    }

    public String getPath() {
        return path;
    }
}
