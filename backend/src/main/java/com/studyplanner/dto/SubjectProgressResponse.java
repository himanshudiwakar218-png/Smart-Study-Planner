package com.studyplanner.dto;

/**
 * Progress metrics for an individual subject.
 */
public class SubjectProgressResponse {

    private Long subjectId;
    private String subjectName;
    private Double targetWeeklyHours;
    private long totalTasks;
    private long completedTasks;
    private long pendingTasks;
    private long inProgressTasks;
    private double completionPercentage;
    private long totalScheduledMinutes;
    private long completedMinutes;

    public SubjectProgressResponse() {
    }

    public SubjectProgressResponse(Long subjectId, String subjectName, Double targetWeeklyHours,
                                   long totalTasks, long completedTasks, long pendingTasks,
                                   long inProgressTasks, double completionPercentage,
                                   long totalScheduledMinutes, long completedMinutes) {
        this.subjectId = subjectId;
        this.subjectName = subjectName;
        this.targetWeeklyHours = targetWeeklyHours;
        this.totalTasks = totalTasks;
        this.completedTasks = completedTasks;
        this.pendingTasks = pendingTasks;
        this.inProgressTasks = inProgressTasks;
        this.completionPercentage = completionPercentage;
        this.totalScheduledMinutes = totalScheduledMinutes;
        this.completedMinutes = completedMinutes;
    }

    // Getters and Setters

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

    public Double getTargetWeeklyHours() {
        return targetWeeklyHours;
    }

    public void setTargetWeeklyHours(Double targetWeeklyHours) {
        this.targetWeeklyHours = targetWeeklyHours;
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

    public double getCompletionPercentage() {
        return completionPercentage;
    }

    public void setCompletionPercentage(double completionPercentage) {
        this.completionPercentage = completionPercentage;
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
}
