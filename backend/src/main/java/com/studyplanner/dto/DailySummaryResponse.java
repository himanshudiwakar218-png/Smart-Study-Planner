package com.studyplanner.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Daily study breakdown containing task counts, minutes, and task list.
 */
public class DailySummaryResponse {

    private LocalDate date;
    private long totalTasks;
    private long completedTasks;
    private long pendingTasks;
    private long inProgressTasks;
    private long totalScheduledMinutes;
    private long completedMinutes;
    private double completionPercentage;
    private List<TaskResponse> tasks;

    public DailySummaryResponse() {
    }

    public DailySummaryResponse(LocalDate date, long totalTasks, long completedTasks,
                                long pendingTasks, long inProgressTasks, long totalScheduledMinutes,
                                long completedMinutes, double completionPercentage,
                                List<TaskResponse> tasks) {
        this.date = date;
        this.totalTasks = totalTasks;
        this.completedTasks = completedTasks;
        this.pendingTasks = pendingTasks;
        this.inProgressTasks = inProgressTasks;
        this.totalScheduledMinutes = totalScheduledMinutes;
        this.completedMinutes = completedMinutes;
        this.completionPercentage = completionPercentage;
        this.tasks = tasks;
    }

    // Getters and Setters

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public long getTotalTasks() {
        return totalTasks;
    }

    public void setTotalTasks(long totalTasks) {
        this.totalTasks = totalTasks;
    }

    public long getCompletedTasks() {
        return completedTasks;
    }

    public void setCompletedTasks(long completedTasks) {
        this.completedTasks = completedTasks;
    }

    public long getPendingTasks() {
        return pendingTasks;
    }

    public void setPendingTasks(long pendingTasks) {
        this.pendingTasks = pendingTasks;
    }

    public long getInProgressTasks() {
        return inProgressTasks;
    }

    public void setInProgressTasks(long inProgressTasks) {
        this.inProgressTasks = inProgressTasks;
    }

    public long getTotalScheduledMinutes() {
        return totalScheduledMinutes;
    }

    public void setTotalScheduledMinutes(long totalScheduledMinutes) {
        this.totalScheduledMinutes = totalScheduledMinutes;
    }

    public long getCompletedMinutes() {
        return completedMinutes;
    }

    public void setCompletedMinutes(long completedMinutes) {
        this.completedMinutes = completedMinutes;
    }

    public double getCompletionPercentage() {
        return completionPercentage;
    }

    public void setCompletionPercentage(double completionPercentage) {
        this.completionPercentage = completionPercentage;
    }

    public List<TaskResponse> getTasks() {
        return tasks;
    }

    public void setTasks(List<TaskResponse> tasks) {
        this.tasks = tasks;
    }
}
