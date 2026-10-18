package com.studyplanner.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for creating or updating a subject.
 */
public class SubjectRequest {

    @NotBlank(message = "Subject name is required")
    @Size(max = 100, message = "Subject name cannot exceed 100 characters")
    private String name;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    @DecimalMin(value = "0.0", message = "Target weekly hours must be non-negative")
    private Double targetWeeklyHours = 0.0;

    public SubjectRequest() {
    }

    public SubjectRequest(String name, String description, Double targetWeeklyHours) {
        this.name = name;
        this.description = description;
        this.targetWeeklyHours = targetWeeklyHours != null ? targetWeeklyHours : 0.0;
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
}
