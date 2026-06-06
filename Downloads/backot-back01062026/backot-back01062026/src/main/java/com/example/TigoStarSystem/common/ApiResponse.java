package com.example.TigoStarSystem.common;

import java.time.OffsetDateTime;

public class ApiResponse<T> {
    private final T data;
    private final String message;
    private final OffsetDateTime timestamp;

    private ApiResponse(T data, String message, OffsetDateTime timestamp) {
        this.data = data;
        this.message = message;
        this.timestamp = timestamp;
    }

    public static <T> ApiResponse<T> of(T data, String message) {
        return new ApiResponse<>(data, message, OffsetDateTime.now());
    }

    public T getData() {
        return data;
    }

    public String getMessage() {
        return message;
    }

    public OffsetDateTime getTimestamp() {
        return timestamp;
    }
}
