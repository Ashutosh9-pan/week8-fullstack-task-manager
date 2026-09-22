package com.ashutosh.taskmanager.repository;

import com.ashutosh.taskmanager.entity.RefreshToken;
import com.ashutosh.taskmanager.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    void deleteByToken(String token);
    void deleteByUser(User user);
}