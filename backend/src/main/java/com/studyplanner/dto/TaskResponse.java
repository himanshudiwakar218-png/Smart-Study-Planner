package com.studyplanner.dto;

import com.studyplanner.model.Priority;
import com.studyplanner.model.StudyTask;
import com.studyplanner.model.TaskStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Response payload representing a study task.
 */
public class TaskResponse {

    private Long id;
    private String title;
    private String description;
    private Long subjectId;
    private String subjectName;
    private LocalDate scheduledDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer durationMinutes;
    private Priority priority;
    private TaskStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;

    public TaskResponse() {
    }

    public TaskResponse(Long id, String title, String description, Long subjectId, String subjectName,
                        LocalDate scheduledDate, LocalTime startTime, LocalTime endTime,
                        Integer durationMinutes, Priority priority, TaskStatus status,
                        LocalDateTime createdAt, LocalDateTime updatedAt, LocalDateTime completedAt) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.subjectId = subjectId;
        this.subjectName = subjectName;
        this.scheduledDate = scheduledDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.durationMinutes = durationMinutes;
        this.priority = priority;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.completedAt = completedAt;
    }

    public static TaskResponse fromEntity(StudyTask task) {
        if (task == null) {
            return null;
        }
        Long subId = task.getSubject() != null ? task.getSubject().getId() : null;
        String subName = task.getSubject() != null ? task.getSubject().getName() : null;

        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                subId,
                subName,
                task.getScheduledDate(),
                task.getStartTime(),
                task.getEndTime(),
                task.getDurationMinutes(),
                task.getPriority(),
                task.getStatus(),
                task.getCreatedAt(),
                task.getUpdatedAt(),
                task.getCompletedAt()
        );
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    public String getSubjectName() {
        return subjectName;
    }

    public void setSubjectName(String subjectName) {
        this.subjectName = subjectName;
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

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
}
