package com.ashutosh.taskmanager.service;

import com.ashutosh.taskmanager.entity.Task;
import com.ashutosh.taskmanager.entity.User;
import com.ashutosh.taskmanager.repository.TaskRepository;
import com.ashutosh.taskmanager.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock TaskRepository taskRepository;
    @Mock UserRepository userRepository;
    @Mock TaskRealtimeService realtimeService;

    private TaskService taskService;
    private User user;

    @BeforeEach
    void setUp() {
        taskService = new TaskService(taskRepository, userRepository, realtimeService);
        user = new User();
        user.setId(1L);
        user.setName("Ashutosh");
        user.setEmail("user@example.com");
        user.setRole(User.Role.USER);
    }

    @Test
    void createTaskAssignsOwnerAndDefaultsAndBroadcasts() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        Task task = new Task();
        task.setId(99L);
        task.setTitle("New task");
        task.setPosition(-1L);

        when(taskRepository.save(task)).thenReturn(task);

        Task saved = taskService.createTask(task, "user@example.com");

        assertSame(user, saved.getUser());
        assertNull(saved.getId());
        assertEquals(Task.Status.IN_PROGRESS, saved.getStatus());
        assertEquals(Task.Priority.MEDIUM, saved.getPriority());
        assertNotNull(saved.getPosition());
        assertTrue(saved.getPosition() >= 0);

        verify(taskRepository).save(task);
        verify(realtimeService).broadcast("TASK_CREATED");
    }

    @Test
    void getAllTasksFiltersSearchStatusPriorityAndSortsByTitle() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        Task beta = task("Beta", Task.Status.TODO, Task.Priority.HIGH, 2L);
        Task alpha = task("Alpha", Task.Status.TODO, Task.Priority.HIGH, 1L);
        Task ignored = task("Other", Task.Status.DONE, Task.Priority.LOW, 0L);

        when(taskRepository.findByUserOrAssigneeEmailIgnoreCase(user, "user@example.com"))
                .thenReturn(List.of(beta, alpha, ignored));

        List<Task> result = taskService.getAllTasks(
                "user@example.com", "a", "TODO", "HIGH", "title");

        assertEquals(List.of(alpha, beta), result);
    }

    @Test
    void getTaskByIdRejectsTaskOutsideUserScope() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(taskRepository.findByIdAndUserOrAssigneeEmailIgnoreCase(
                42L, user, "user@example.com")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> taskService.getTaskById(42L, "user@example.com"));

        assertEquals("Task not found with id: 42", ex.getMessage());
    }

    @Test
    void updateTaskCopiesEditableFieldsAndBroadcasts() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        Task existing = task("Old", Task.Status.TODO, Task.Priority.LOW, 1L);
        existing.setId(10L);
        existing.setUser(user);

        when(taskRepository.findByIdAndUserOrAssigneeEmailIgnoreCase(
                10L, user, "user@example.com")).thenReturn(Optional.of(existing));
        when(taskRepository.save(existing)).thenReturn(existing);

        Task update = task("Updated", Task.Status.DONE, Task.Priority.HIGH, 7L);
        update.setDescription("New description");
        update.setCompleted(true);
        update.setDueDate(LocalDateTime.of(2026, 10, 1, 10, 0));
        update.setCategory("Work");
        update.setAssigneeEmail("assignee@example.com");

        Task result = taskService.updateTask(10L, update, "user@example.com");

        assertSame(existing, result);
        assertEquals("Updated", existing.getTitle());
        assertEquals("New description", existing.getDescription());
        assertTrue(existing.isCompleted());
        assertEquals(Task.Status.DONE, existing.getStatus());
        assertEquals(Task.Priority.HIGH, existing.getPriority());
        assertEquals(update.getDueDate(), existing.getDueDate());
        assertEquals(7L, existing.getPosition());
        assertEquals("Work", existing.getCategory());
        assertEquals("assignee@example.com", existing.getAssigneeEmail());

        verify(taskRepository).save(existing);
        verify(realtimeService).broadcast("TASK_UPDATED");
    }

    @Test
    void deleteTaskRemovesTaskAndBroadcasts() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        Task task = task("Delete me", Task.Status.TODO, Task.Priority.MEDIUM, 1L);
        task.setId(20L);

        when(taskRepository.findByIdAndUserOrAssigneeEmailIgnoreCase(
                20L, user, "user@example.com")).thenReturn(Optional.of(task));

        taskService.deleteTask(20L, "user@example.com");

        verify(taskRepository).delete(task);
        verify(realtimeService).broadcast("TASK_DELETED");
    }

    @Test
    void missingUserIsRejectedBeforeTaskAccess() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        assertThrows(
                UsernameNotFoundException.class,
                () -> taskService.getAllTasks(
                        "missing@example.com", null, null, null, "position"));

        verifyNoInteractions(taskRepository);
    }

    private Task task(String title, Task.Status status, Task.Priority priority, Long position) {
        Task task = new Task();
        task.setTitle(title);
        task.setStatus(status);
        task.setPriority(priority);
        task.setPosition(position);
        return task;
    }
}
