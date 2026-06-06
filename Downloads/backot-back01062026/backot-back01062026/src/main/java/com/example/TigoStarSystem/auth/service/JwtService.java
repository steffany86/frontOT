package com.example.TigoStarSystem.auth.service;

import com.example.TigoStarSystem.auth.dto.AuthLoginResponse;
import com.example.TigoStarSystem.common.ApiException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Date;

@Service
public class JwtService {
    private final String secret;
    private final Duration accessTtl;
    private SecretKey signingKey;

    public JwtService(
            @Value("${auth.jwt.secret:CHANGE_ME_SUPER_SECRET_KEY_2026_TIGOSTAR_SYSTEM}") String secret,
            @Value("${auth.jwt.access-ttl-minutes:480}") long accessTtlMinutes
    ) {
        this.secret = secret;
        this.accessTtl = Duration.ofMinutes(accessTtlMinutes);
    }

    @PostConstruct
    void init() {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("auth.jwt.secret debe tener al menos 32 bytes.");
        }
        this.signingKey = Keys.hmacShaKeyFor(bytes);
    }

    public String generateAccessToken(AuthLoginResponse user, OffsetDateTime expira) {
        if (user == null || user.getIdUsuario() == null) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "TOKEN_BUILD_ERROR", "No se pudo construir el token.");
        }
        OffsetDateTime expireAt = expira != null ? expira : OffsetDateTime.now().plus(accessTtl);
        return Jwts.builder()
                .setSubject(String.valueOf(user.getIdUsuario()))
                .claim("idUsuario", user.getIdUsuario())
                .claim("nombre", user.getNombre())
                .claim("loggin", user.getLoggin())
                .claim("rol", user.getRol())
                .claim("idRol", user.getIdRol())
                .claim("idSucursal", user.getIdSucursal())
                .claim("necesitaCambio", user.getNecesitaCambio())
                .setIssuedAt(new Date())
                .setExpiration(Date.from(expireAt.toInstant()))
                .signWith(signingKey)
                .compact();
    }

    public ParsedToken parseAccessToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(signingKey)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            Integer idUsuario = asInteger(claims.get("idUsuario"));
            Integer idRol = asInteger(claims.get("idRol"));
            Integer idSucursal = asInteger(claims.get("idSucursal"));
            Boolean necesitaCambio = asBoolean(claims.get("necesitaCambio"));
            Date exp = claims.getExpiration();
            OffsetDateTime expira = exp == null ? null : OffsetDateTime.ofInstant(exp.toInstant(), ZoneOffset.UTC);
            AuthLoginResponse user = new AuthLoginResponse(
                    idUsuario,
                    asString(claims.get("nombre")),
                    asString(claims.get("loggin")),
                    asString(claims.get("rol")),
                    idRol,
                    idSucursal,
                    necesitaCambio,
                    null
            );
            return new ParsedToken(user, expira);
        } catch (ExpiredJwtException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED", "Sesion expirada.");
        } catch (MalformedJwtException | UnsupportedJwtException | SignatureException | IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_INVALID", "Sesion invalida.");
        }
    }

    private Integer asInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Boolean asBoolean(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        String text = String.valueOf(value).trim().toLowerCase();
        if ("true".equals(text) || "1".equals(text)) {
            return true;
        }
        if ("false".equals(text) || "0".equals(text)) {
            return false;
        }
        return null;
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    public static final class ParsedToken {
        private final AuthLoginResponse user;
        private final OffsetDateTime expira;

        public ParsedToken(AuthLoginResponse user, OffsetDateTime expira) {
            this.user = user;
            this.expira = expira;
        }

        public AuthLoginResponse getUser() {
            return user;
        }

        public OffsetDateTime getExpira() {
            return expira;
        }
    }
}
