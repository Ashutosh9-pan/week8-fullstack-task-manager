package com.ashutosh.taskmanager.service;

import com.ashutosh.taskmanager.dto.AuthResponse;
import com.ashutosh.taskmanager.dto.LoginRequest;
import com.ashutosh.taskmanager.dto.RegisterRequest;
import com.ashutosh.taskmanager.entity.RefreshToken;
import com.ashutosh.taskmanager.entity.User;
import com.ashutosh.taskmanager.repository.UserRepository;
import com.ashutosh.taskmanager.security.AuthRateLimiter;
import com.ashutosh.taskmanager.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtService jwtService;
    @Mock RefreshTokenService refreshTokenService;
    @Mock AuthRateLimiter rateLimiter;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                passwordEncoder,
                jwtService,
                refreshTokenService,
                rateLimiter
        );
        when(rateLimiter.allow(anyString())).thenReturn(true);
    }

    @Test
    void registerCreatesUserWithHashedPasswordAndReturnsTokens() {
        RegisterRequest request = new RegisterRequest();
        request.setName(" Ashutosh ");
        request.setEmail("ASHUTOSH@EXAMPLE.COM");
        request.setPassword("password123");

        when(userRepository.existsByEmail("ashutosh@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed-password");

        User saved = user("ashutosh@example.com");
        saved.setName("Ashutosh");
        saved.setPassword("hashed-password");
        when(userRepository.save(any(User.class))).thenReturn(saved);
        when(jwtService.generateToken("ashutosh@example.com")).thenReturn("access-token");
        when(refreshTokenService.create(saved)).thenReturn(refreshToken("refresh-token", saved));

        AuthResponse response = authService.register(request);

        assertEquals("access-token", response.getAccessToken());
        assertEquals("refresh-token", response.getRefreshToken());
        assertEquals("ashutosh@example.com", response.getEmail());
        assertEquals("USER", response.getRole());

        verify(passwordEncoder).encode("password123");
        verify(userRepository).save(argThat(u ->
                u.getName().equals("Ashutosh")
                        && u.getEmail().equals("ashutosh@example.com")
                        && u.getPassword().equals("hashed-password")
                        && u.getRole() == User.Role.USER));
    }

    @Test
    void loginRejectsWrongPassword() {
        User user = user("user@example.com");
        user.setPassword("stored-hash");

        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("wrong");

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "stored-hash")).thenReturn(false);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> authService.login(request));

        assertEquals("Invalid email or password", ex.getMessage());
        verify(jwtService, never()).generateToken(anyString());
        verify(refreshTokenService, never()).create(any());
    }

    @Test
    void refreshRevokesOldTokenAndIssuesRotatedTokens() {
        User user = user("user@example.com");
        RefreshToken oldToken = refreshToken("old-refresh", user);
        RefreshToken newToken = refreshToken("new-refresh", user);

        when(refreshTokenService.validate("old-refresh")).thenReturn(user);
        when(jwtService.generateToken("user@example.com")).thenReturn("new-access");
        when(refreshTokenService.create(user)).thenReturn(newToken);

        AuthResponse response = authService.refresh("old-refresh");

        assertEquals("new-access", response.getAccessToken());
        assertEquals("new-refresh", response.getRefreshToken());
        verify(refreshTokenService).validate("old-refresh");
        verify(refreshTokenService).revoke("old-refresh");
        verify(refreshTokenService).create(user);
        assertNotEquals(oldToken.getToken(), response.getRefreshToken());
    }

    @Test
    void authenticationRateLimitBlocksRegistration() {
        when(rateLimiter.allow("user@example.com")).thenReturn(false);

        RegisterRequest request = new RegisterRequest();
        request.setName("User");
        request.setEmail("user@example.com");
        request.setPassword("password123");

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> authService.register(request));

        assertEquals("Too many authentication attempts. Try again later.", ex.getMessage());
        verifyNoInteractions(userRepository, passwordEncoder, jwtService, refreshTokenService);
    }

    private User user(String email) {
        User user = new User();
        user.setId(1L);
        user.setName("User");
        user.setEmail(email);
        user.setPassword("hash");
        user.setRole(User.Role.USER);
        return user;
    }

    private RefreshToken refreshToken(String token, User user) {
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken(token);
        refreshToken.setUser(user);
        return refreshToken;
    }
}
