package com.ashutosh.taskmanager.service;

import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import java.io.IOException;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

@Service
public class TaskRealtimeService {
    private final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();

    public void register(WebSocketSession session) {
        sessions.add(session);
    }

    public void unregister(WebSocketSession session) {
        sessions.remove(session);
    }

    public void broadcast(String event) {
        TextMessage message = new TextMessage(event);
        for (WebSocketSession session : sessions) {
            if (!session.isOpen()) {
                sessions.remove(session);
                continue;
            }
            try {
                session.sendMessage(message);
            } catch (IOException e) {
                sessions.remove(session);
            }
        }
    }
}