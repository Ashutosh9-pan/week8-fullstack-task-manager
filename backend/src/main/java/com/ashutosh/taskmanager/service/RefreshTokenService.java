package com.ashutosh.taskmanager.service;

import com.ashutosh.taskmanager.entity.RefreshToken;
import com.ashutosh.taskmanager.entity.User;
import com.ashutosh.taskmanager.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class RefreshTokenService {
    private final RefreshTokenRepository repository;
    private final long expirationMillis;

    public RefreshTokenService(
            RefreshTokenRepository repository,
            @Value("\${jwt.refresh-expiration:604800000}") String expirationValue) {
        this.repository = repository;
        this.expirationMillis = parseExpiration(expirationValue);
    }

    public RefreshToken create(User user) {
        repository.deleteByUser(user);
        RefreshToken token = new RefreshToken();
        token.setToken(UUID.randomUUID() + "." + UUID.randomUUID());
        token.setUser(user);
        token.setExpiresAt(LocalDateTime.now().plusNanos(expirationMillis * 1_000_000L));
        return repository.save(token);
    }

    public User validate(String token) {
        RefreshToken stored = repository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));
        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            repository.delete(stored);
            throw new IllegalArgumentException("Refresh token expired");
        }
        return stored.getUser();
    }

    public void revoke(String token) {
        repository.deleteByToken(token);
    }

    private long parseExpiration(String value) {
        try {
            long parsed = Long.parseLong(value == null ? "" : value.trim());
            return parsed > 0 ? parsed : 604800000L;
        } catch (NumberFormatException e) {
            return 604800000L;
        }
    }
}