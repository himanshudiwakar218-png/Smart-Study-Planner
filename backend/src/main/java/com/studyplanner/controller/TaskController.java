package com.studyplanner.controller;

import com.studyplanner.dto.TaskRequest;
import com.studyplanner.dto.TaskResponse;
import com.studyplanner.model.Priority;
import com.studyplanner.model.TaskStatus;
import com.studyplanner.service.StudyService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * REST Controller for managing study tasks under /api/tasks.
 */
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final StudyService studyService;

    public TaskController(StudyService studyService) {
        this.studyService = studyService;
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody TaskRequest request) {
        TaskResponse response = studyService.createTask(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getAllTasks(
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false, defaultValue = "date") String sortBy,
            @RequestParam(required = false, defaultValue = "asc") String sortDirection) {

        List<TaskResponse> tasks = studyService.getAllTasks(subjectId, date, status, priority, sortBy, sortDirection);
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/today")
    public ResponseEntity<List<TaskResponse>> getTodayTasks() {
        List<TaskResponse> tasks = studyService.getTodayTasks();
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/pending")
    public ResponseEntity<List<TaskResponse>> getPendingTasks() {
        List<TaskResponse> tasks = studyService.getPendingTasks();
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/overdue")
    public ResponseEntity<List<TaskResponse>> getOverdueTasks() {
        List<TaskResponse> tasks = studyService.getOverdueTasks();
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable Long id) {
        TaskResponse response = studyService.getTaskById(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable Long id,
                                                   @Valid @RequestBody TaskRequest request) {
        TaskResponse response = studyService.updateTask(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        studyService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<TaskResponse> completeTask(@PathVariable Long id) {
        TaskResponse response = studyService.completeTask(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/reopen")
    public ResponseEntity<TaskResponse> reopenTask(@PathVariable Long id) {
        TaskResponse response = studyService.reopenTask(id);
        return ResponseEntity.ok(response);
    }
}
