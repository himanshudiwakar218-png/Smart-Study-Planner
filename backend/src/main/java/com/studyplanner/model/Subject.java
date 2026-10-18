package com.studyplanner.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

/**
 * Entity representing an academic subject or study topic.
 */
@Entity
@Table(name = "subjects", indexes = {
    @Index(name = "idx_subjects_name", columnList = "name", unique = true)
})
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Subject name is required")
    @Column(nullable = false, unique = true)
    private String name;

    @Column(length = 1000)
    private String description;

    @Min(value = 0, message = "Weekly target minutes must be non-negative")
    @Column(name = "weekly_target_minutes")
    private Integer weeklyTargetMinutes = 0;

    @DecimalMin(value = "0.0", message = "Target weekly study hours must be non-negative")
    @Column(name = "target_weekly_hours", nullable = false)
    private Double targetWeeklyHours = 0.0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Subject() {
    }

    public Subject(String name, String description, Double targetWeeklyHours) {
        this.name = name;
        this.description = description;
        setTargetWeeklyHours(targetWeeklyHours != null ? targetWeeklyHours : 0.0);
    }

    public Subject(Long id, String name, String description, Double targetWeeklyHours) {
        this.id = id;
        this.name = name;
        this.description = description;
        setTargetWeeklyHours(targetWeeklyHours != null ? targetWeeklyHours : 0.0);
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
        if (this.targetWeeklyHours == null) {
            this.targetWeeklyHours = 0.0;
        }
        if (this.weeklyTargetMinutes == null) {
            this.weeklyTargetMinutes = (int) Math.round(this.targetWeeklyHours * 60);
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.targetWeeklyHours == null) {
            this.targetWeeklyHours = 0.0;
        }
        if (this.weeklyTargetMinutes == null) {
            this.weeklyTargetMinutes = (int) Math.round(this.targetWeeklyHours * 60);
        }
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getWeeklyTargetMinutes() {
        return weeklyTargetMinutes;
    }

    public void setWeeklyTargetMinutes(Integer weeklyTargetMinutes) {
        this.weeklyTargetMinutes = weeklyTargetMinutes != null ? weeklyTargetMinutes : 0;
        this.targetWeeklyHours = this.weeklyTargetMinutes / 60.0;
    }

    public Double getTargetWeeklyHours() {
        return targetWeeklyHours;
    }

    public void setTargetWeeklyHours(Double targetWeeklyHours) {
        this.targetWeeklyHours = targetWeeklyHours != null ? targetWeeklyHours : 0.0;
        this.weeklyTargetMinutes = (int) Math.round(this.targetWeeklyHours * 60);
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
}
