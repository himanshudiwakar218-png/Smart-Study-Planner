package com.studyplanner.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Request DTO for validating whether a proposed study schedule conflicts with existing tasks.
 */
public class ScheduleValidateRequest {

    @NotNull(message = "Scheduled date is required")
    private LocalDate scheduledDate;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "Duration in minutes is required")
    @Min(value = 1, message = "Duration must be greater than zero minutes")
    private Integer durationMinutes;

    private Long excludeTaskId;

    public ScheduleValidateRequest() {
    }

    public ScheduleValidateRequest(LocalDate scheduledDate, LocalTime startTime, Integer durationMinutes, Long excludeTaskId) {
        this.scheduledDate = scheduledDate;
        this.startTime = startTime;
        this.durationMinutes = durationMinutes;
        this.excludeTaskId = excludeTaskId;
    }

    // Getters and Setters

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

    public Long getExcludeTaskId() {
        return excludeTaskId;
    }

    public void setExcludeTaskId(Long excludeTaskId) {
        this.excludeTaskId = excludeTaskId;
    }
}
