package com.studyplanner.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Entity representing an individual study task or session.
 */
@Entity
@Table(name = "study_tasks", indexes = {
    @Index(name = "idx_tasks_subject_id", columnList = "subject_id"),
    @Index(name = "idx_tasks_scheduled_date", columnList = "scheduled_date"),
    @Index(name = "idx_tasks_status", columnList = "status"),
    @Index(name = "idx_tasks_priority", columnList = "priority")
})
public class StudyTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Task title is required")
    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @NotNull(message = "Subject is required")
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @NotNull(message = "Scheduled date is required")
    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @NotNull(message = "Start time is required")
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @NotNull(message = "Duration in minutes is required")
    @Min(value = 1, message = "Duration must be greater than zero minutes")
    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @NotNull(message = "Priority is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority = Priority.MEDIUM;

    @NotNull(message = "Status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public StudyTask() {
    }

    public StudyTask(String title, String description, Subject subject, LocalDate scheduledDate,
                     LocalTime startTime, Integer durationMinutes, Priority priority, TaskStatus status) {
        this.title = title;
        this.description = description;
        this.subject = subject;
        this.scheduledDate = scheduledDate;
        this.startTime = startTime;
        this.durationMinutes = durationMinutes;
        this.priority = priority != null ? priority : Priority.MEDIUM;
        this.status = status != null ? status : TaskStatus.PENDING;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.priority == null) {
            this.priority = Priority.MEDIUM;
        }
        if (this.status == null) {
            this.status = TaskStatus.PENDING;
        }
        if (this.status == TaskStatus.COMPLETED && this.completedAt == null) {
            this.completedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Calculates the end time of the study session.
     * Note: End time is non-inclusive for conflict calculations.
     */
    public LocalTime getEndTime() {
        if (startTime == null || durationMinutes == null) {
            return null;
        }
        return startTime.plusMinutes(durationMinutes);
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

    public Subject getSubject() {
        return subject;
    }

    public void setSubject(Subject subject) {
        this.subject = subject;
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
