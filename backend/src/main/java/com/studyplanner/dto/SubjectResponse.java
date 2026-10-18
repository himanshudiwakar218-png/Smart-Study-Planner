package com.studyplanner.dto;

import com.studyplanner.model.Subject;
import java.time.LocalDateTime;

/**
 * Response payload representing a study subject.
 */
public class SubjectResponse {

    private Long id;
    private String name;
    private String description;
    private Double targetWeeklyHours;
    private LocalDateTime createdAt;

    public SubjectResponse() {
    }

    public SubjectResponse(Long id, String name, String description, Double targetWeeklyHours, LocalDateTime createdAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.targetWeeklyHours = targetWeeklyHours;
        this.createdAt = createdAt;
    }

    public static SubjectResponse fromEntity(Subject subject) {
        if (subject == null) {
            return null;
        }
        return new SubjectResponse(
                subject.getId(),
                subject.getName(),
                subject.getDescription(),
                subject.getTargetWeeklyHours(),
                subject.getCreatedAt()
        );
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

    public Double getTargetWeeklyHours() {
        return targetWeeklyHours;
    }

    public void setTargetWeeklyHours(Double targetWeeklyHours) {
        this.targetWeeklyHours = targetWeeklyHours;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
