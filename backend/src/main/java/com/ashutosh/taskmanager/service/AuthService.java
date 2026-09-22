package com.ashutosh.taskmanager.service;

import com.ashutosh.taskmanager.dto.AuthResponse;
import com.ashutosh.taskmanager.dto.LoginRequest;
import com.ashutosh.taskmanager.dto.RegisterRequest;
import com.ashutosh.taskmanager.entity.RefreshToken;
import com.ashutosh.taskmanager.entity.User;
import com.ashutosh.taskmanager.exception.TooManyRequestsException;
import com.ashutosh.taskmanager.repository.UserRepository;
import com.ashutosh.taskmanager.security.AuthRateLimiter;
import com.ashutosh.taskmanager.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final AuthRateLimiter rateLimiter;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            AuthRateLimiter rateLimiter) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.rateLimiter = rateLimiter;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        guard(request.getEmail());
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = new User();
        user.setName(request.getName().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(User.Role.USER);

        User savedUser = userRepository.save(user);
        return buildResponse(savedUser);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        guard(request.getEmail());
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        return buildResponse(user);
    }

    @Transactional
    public AuthResponse refresh(String refreshToken) {
        User user = refreshTokenService.validate(refreshToken);
        refreshTokenService.revoke(refreshToken);
        return buildResponse(user);
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenService.revoke(refreshToken);
    }

    private AuthResponse buildResponse(User user) {
        String accessToken = jwtService.generateToken(user.getEmail());
        RefreshToken refreshToken = refreshTokenService.create(user);
        return new AuthResponse(
                accessToken,
                refreshToken.getToken(),
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name());
    }

    private void guard(String email) {
        String key = email == null ? "unknown" : email.trim().toLowerCase();
        if (!rateLimiter.allow(key)) {
            throw new TooManyRequestsException("Too many authentication attempts. Try again later.");
        }
    }
}