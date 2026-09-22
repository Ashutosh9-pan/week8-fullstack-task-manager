package com.ashutosh.taskmanager.dto;

public class AuthResponse {
    private String token;
    private String accessToken;
    private String refreshToken;
    private Long userId;
    private String name;
    private String email;
    private String role;

    public AuthResponse() {}

    public AuthResponse(String token, String refreshToken, Long userId, String name, String email, String role) {
        this.token = token;
        this.accessToken = token;
        this.refreshToken = refreshToken;
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.role = role;
    }

    public String getToken() { return token; }
    public String getAccessToken() { return accessToken; }
    public String getRefreshToken() { return refreshToken; }
    public Long getUserId() { return userId; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
}