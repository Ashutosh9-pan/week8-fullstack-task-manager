package com.ashutosh.taskmanager.repository;

import com.ashutosh.taskmanager.entity.Task;
import com.ashutosh.taskmanager.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByUser(User user);
    List<Task> findByUserOrAssigneeEmailIgnoreCase(User user, String assigneeEmail);
    Optional<Task> findByIdAndUser(Long id, User user);
    Optional<Task> findByIdAndUserOrAssigneeEmailIgnoreCase(Long id, User user, String assigneeEmail);
}
