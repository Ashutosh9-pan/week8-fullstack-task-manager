package com.ashutosh.taskmanager.config;

import com.ashutosh.taskmanager.service.TaskRealtimeService;
import com.ashutosh.taskmanager.service.TaskWebSocketHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final TaskRealtimeService realtimeService;

    public WebSocketConfig(TaskRealtimeService realtimeService) {
        this.realtimeService = realtimeService;
    }

    @Bean
    public TaskWebSocketHandler taskWebSocketHandler() {
        return new TaskWebSocketHandler(realtimeService);
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(taskWebSocketHandler(), "/ws/tasks")
                .setAllowedOrigins(
                        "http://localhost:5173",
                        "http://localhost:5174",
                        "https://week8-fullstack-task-manager.onrender.com");
    }
}