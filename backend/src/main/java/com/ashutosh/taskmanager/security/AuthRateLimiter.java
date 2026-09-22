package com.ashutosh.taskmanager.security;

import org.springframework.stereotype.Component;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AuthRateLimiter {
    private static final int LIMIT = 8;
    private static final long WINDOW_SECONDS = 60;

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public boolean allow(String key) {
        Instant now = Instant.now();
        Window window = windows.computeIfAbsent(key, ignored -> new Window(now, 0));
        synchronized (window) {
            if (now.getEpochSecond() - window.startedAt.getEpochSecond() >= WINDOW_SECONDS) {
                window.startedAt = now;
                window.count = 0;
            }
            if (window.count >= LIMIT) return false;
            window.count++;
            return true;
        }
    }

    private static final class Window {
        private Instant startedAt;
        private int count;
        private Window(Instant startedAt, int count) {
            this.startedAt = startedAt;
            this.count = count;
        }
    }
}