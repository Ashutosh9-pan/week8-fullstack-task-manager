package com.ashutosh.taskmanager.service;

import com.ashutosh.taskmanager.entity.Task;
import com.ashutosh.taskmanager.entity.User;
import com.ashutosh.taskmanager.repository.TaskRepository;
import com.ashutosh.taskmanager.repository.UserRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class TaskService {
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final TaskRealtimeService realtimeService;

    public TaskService(
            TaskRepository taskRepository,
            UserRepository userRepository,
            TaskRealtimeService realtimeService) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.realtimeService = realtimeService;
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    public List<Task> getAllTasks(String email, String q, String status, String priority, String sort) {
        User user = getUserByEmail(email);
        String query = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        return taskRepository.findByUserOrAssigneeEmailIgnoreCase(user, email).stream()
                .filter(task -> query.isEmpty()
                        || task.getTitle().toLowerCase(Locale.ROOT).contains(query)
                        || (task.getDescription() != null
                            && task.getDescription().toLowerCase(Locale.ROOT).contains(query)))
                .filter(task -> status == null || status.isBlank()
                        || task.getStatus().name().equalsIgnoreCase(status))
                .filter(task -> priority == null || priority.isBlank()
                        || task.getPriority().name().equalsIgnoreCase(priority))
                .sorted(comparator(sort))
                .toList();
    }

    public Task getTaskById(Long id, String email) {
        User user = getUserByEmail(email);
        return taskRepository.findByIdAndUserOrAssigneeEmailIgnoreCase(id, user, email)
                .orElseThrow(() -> new IllegalArgumentException("Task not found with id: " + id));
    }

    public Task createTask(Task task, String email) {
        User user = getUserByEmail(email);
        task.setId(null);
        task.setUser(user);
        if (task.getPosition() == null || task.getPosition() < 0) {
            task.setPosition(System.currentTimeMillis());
        }
        if (task.getStatus() == null) {
            task.setStatus(Task.Status.IN_PROGRESS);
        }
        if (task.getPriority() == null) {
            task.setPriority(Task.Priority.MEDIUM);
        }
        Task saved = taskRepository.save(task);
        realtimeService.broadcast("TASK_CREATED");
        return saved;
    }

    public Task updateTask(Long id, Task updatedTask, String email) {
        Task existingTask = getTaskById(id, email);
        existingTask.setTitle(updatedTask.getTitle());
        existingTask.setDescription(updatedTask.getDescription());
        existingTask.setCompleted(updatedTask.isCompleted());
        if (updatedTask.getStatus() != null) existingTask.setStatus(updatedTask.getStatus());
        if (updatedTask.getPriority() != null) existingTask.setPriority(updatedTask.getPriority());
        existingTask.setDueDate(updatedTask.getDueDate());
        if (updatedTask.getPosition() != null) existingTask.setPosition(updatedTask.getPosition());
        existingTask.setCategory(updatedTask.getCategory());
        existingTask.setAssigneeEmail(updatedTask.getAssigneeEmail());

        Task saved = taskRepository.save(existingTask);
        realtimeService.broadcast("TASK_UPDATED");
        return saved;
    }

    public void deleteTask(Long id, String email) {
        Task task = getTaskById(id, email);
        taskRepository.delete(task);
        realtimeService.broadcast("TASK_DELETED");
    }

    private Comparator<Task> comparator(String sort) {
        String value = sort == null ? "position" : sort.toLowerCase(Locale.ROOT);
        return switch (value) {
            case "due" -> Comparator.comparing(
                    Task::getDueDate,
                    Comparator.nullsLast(Comparator.naturalOrder()));
            case "priority" -> Comparator.comparingInt(
                    task -> priorityWeight(task.getPriority()));
            case "created" -> Comparator.comparing(
                    (Task task) -> task.getCreatedAt(),
                    Comparator.nullsLast(Comparator.reverseOrder()));
            case "title" -> Comparator.comparing(
                    (Task task) -> task.getTitle().toLowerCase(Locale.ROOT));
            default -> Comparator.comparing(
                    Task::getPosition,
                    Comparator.nullsLast(Comparator.naturalOrder()));
        };
    }

    private int priorityWeight(Task.Priority priority) {
        if (priority == Task.Priority.HIGH) return 0;
        if (priority == Task.Priority.MEDIUM) return 1;
        return 2;
    }
}