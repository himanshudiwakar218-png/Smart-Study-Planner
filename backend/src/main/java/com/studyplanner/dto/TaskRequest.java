package com.studyplanner.dto;

import com.studyplanner.model.Priority;
import com.studyplanner.model.TaskStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Request payload for creating or updating a study task.
 */
public class TaskRequest {

    @NotBlank(message = "Task title is required")
    @Size(max = 200, message = "Title cannot exceed 200 characters")
    private String title;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    @NotNull(message = "Subject ID is required")
    private Long subjectId;

    @NotNull(message = "Scheduled date is required")
    private LocalDate scheduledDate;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "Duration in minutes is required")
    @Min(value = 1, message = "Duration must be greater than zero minutes")
    private Integer durationMinutes;

    private Priority priority = Priority.MEDIUM;

    private TaskStatus status = TaskStatus.PENDING;

    public TaskRequest() {
    }

    public TaskRequest(String title, String description, Long subjectId, LocalDate scheduledDate,
                       LocalTime startTime, Integer durationMinutes, Priority priority, TaskStatus status) {
        this.title = title;
        this.description = description;
        this.subjectId = subjectId;
        this.scheduledDate = scheduledDate;
        this.startTime = startTime;
        this.durationMinutes = durationMinutes;
        this.priority = priority != null ? priority : Priority.MEDIUM;
        this.status = status != null ? status : TaskStatus.PENDING;
    }

    // Getters and Setters

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(Long subjectId) {
        this.subjectId = subjectId;
    }

    public LocalDate getScheduledDate() {
        return scheduledDate;
    }

    public void setScheduledDate(LocalDate scheduledDate) {
        this.scheduledDate = scheduledDate;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public void setStatus(TaskStatus status) {
        this.status = status;
    }
}
