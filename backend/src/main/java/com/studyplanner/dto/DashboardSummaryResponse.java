package com.studyplanner.dto;

/**
 * Summary metrics for the dashboard.
 */
public class DashboardSummaryResponse {

    private long totalSubjects;
    private long totalTasks;
    private long pendingTasks;
    private long inProgressTasks;
    private long completedTasks;
    private long overdueTasks;
    private long todayScheduledTasks;
    private long todayCompletedTasks;
    private long totalScheduledMinutes;
    private long completedStudyMinutes;
    private double overallCompletionPercentage;

    public DashboardSummaryResponse() {
    }

    public DashboardSummaryResponse(long totalSubjects, long totalTasks, long pendingTasks,
                                    long inProgressTasks, long completedTasks, long overdueTasks,
                                    long todayScheduledTasks, long todayCompletedTasks,
                                    long totalScheduledMinutes, long completedStudyMinutes,
                                    double overallCompletionPercentage) {
        this.totalSubjects = totalSubjects;
        this.totalTasks = totalTasks;
        this.pendingTasks = pendingTasks;
        this.inProgressTasks = inProgressTasks;
        this.completedTasks = completedTasks;
        this.overdueTasks = overdueTasks;
        this.todayScheduledTasks = todayScheduledTasks;
        this.todayCompletedTasks = todayCompletedTasks;
        this.totalScheduledMinutes = totalScheduledMinutes;
        this.completedStudyMinutes = completedStudyMinutes;
        this.overallCompletionPercentage = overallCompletionPercentage;
    }

    // Getters and Setters

    public long getTotalSubjects() {
        return totalSubjects;
    }

    public void setTotalSubjects(long totalSubjects) {
        this.totalSubjects = totalSubjects;
    }

    public long getTotalTasks() {
        return totalTasks;
    }

    public void setTotalTasks(long totalTasks) {
        this.totalTasks = totalTasks;
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

    public long getCompletedTasks() {
        return completedTasks;
    }

    public void setCompletedTasks(long completedTasks) {
        this.completedTasks = completedTasks;
    }

    public long getOverdueTasks() {
        return overdueTasks;
    }

    public void setOverdueTasks(long overdueTasks) {
        this.overdueTasks = overdueTasks;
    }

    public long getTodayScheduledTasks() {
        return todayScheduledTasks;
    }

    public void setTodayScheduledTasks(long todayScheduledTasks) {
        this.todayScheduledTasks = todayScheduledTasks;
    }

    public long getTodayCompletedTasks() {
        return todayCompletedTasks;
    }

    public void setTodayCompletedTasks(long todayCompletedTasks) {
        this.todayCompletedTasks = todayCompletedTasks;
    }

    public long getTotalScheduledMinutes() {
        return totalScheduledMinutes;
    }

    public void setTotalScheduledMinutes(long totalScheduledMinutes) {
        this.totalScheduledMinutes = totalScheduledMinutes;
    }

    public long getCompletedStudyMinutes() {
        return completedStudyMinutes;
    }

    public void setCompletedStudyMinutes(long completedStudyMinutes) {
        this.completedStudyMinutes = completedStudyMinutes;
    }

    public double getOverallCompletionPercentage() {
        return overallCompletionPercentage;
    }

    public void setOverallCompletionPercentage(double overallCompletionPercentage) {
        this.overallCompletionPercentage = overallCompletionPercentage;
    }
}
