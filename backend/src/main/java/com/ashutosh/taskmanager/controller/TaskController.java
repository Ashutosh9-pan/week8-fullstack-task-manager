package com.ashutosh.taskmanager.controller;
import com.ashutosh.taskmanager.entity.Task;
import com.ashutosh.taskmanager.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*")
public class TaskController {
    private final TaskService taskService;
    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }
    @GetMapping
    public ResponseEntity<List<Task>> getAllTasks(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(
                taskService.getAllTasks(email)
        );
    }
    @GetMapping("/{id}")
    public ResponseEntity<Task> getTaskById(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(
                taskService.getTaskById(id, email)
        );
    }
    @PostMapping
    public ResponseEntity<Task> createTask(
            @Valid @RequestBody Task task,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.status(HttpStatus.CREATED).body(
                taskService.createTask(task, email)
        );
    }
    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(
            @PathVariable Long id,
            @Valid @RequestBody Task task,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(
                taskService.updateTask(id, task, email)
        );
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        taskService.deleteTask(id, email);
        return ResponseEntity.noContent().build();
    }
}
