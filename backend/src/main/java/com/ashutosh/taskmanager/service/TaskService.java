package com.ashutosh.taskmanager.service;
import com.ashutosh.taskmanager.entity.Task;
import com.ashutosh.taskmanager.entity.User;
import com.ashutosh.taskmanager.repository.TaskRepository;
import com.ashutosh.taskmanager.repository.UserRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import java.util.List;
@Service
public class TaskService {
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    public TaskService(
            TaskRepository taskRepository,
            UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }
    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found"));
    }
    public List<Task> getAllTasks(String email) {
        User user = getUserByEmail(email);
        return taskRepository.findByUser(user);
    }
    public Task getTaskById(Long id, String email) {
        User user = getUserByEmail(email);
        return taskRepository.findByIdAndUser(id, user)
                .orElseThrow(() ->
                        new RuntimeException("Task not found with id: " + id));
    }
    public Task createTask(Task task, String email) {
        User user = getUserByEmail(email);
        task.setId(null);
        task.setUser(user);
        return taskRepository.save(task);
    }
    public Task updateTask(Long id, Task updatedTask, String email) {
        Task existingTask = getTaskById(id, email);
        existingTask.setTitle(updatedTask.getTitle());
        existingTask.setDescription(updatedTask.getDescription());
        existingTask.setCompleted(updatedTask.isCompleted());
        return taskRepository.save(existingTask);
    }
    public void deleteTask(Long id, String email) {
        Task task = getTaskById(id, email);
        taskRepository.delete(task);
    }
}
