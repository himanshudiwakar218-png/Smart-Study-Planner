package com.studyplanner.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * 7-day weekly study summary with day-by-day and subject-by-subject breakdowns.
 */
public class WeeklySummaryResponse {

    private LocalDate startDate;
    private LocalDate endDate;
    private long totalTasks;
    private long completedTasks;
    private long totalScheduledMinutes;
    private long completedMinutes;
    private double completionPercentage;
    private List<DailySummaryResponse> dailyBreakdown;
    private List<SubjectProgressResponse> subjectBreakdown;

    public WeeklySummaryResponse() {
    }

    public WeeklySummaryResponse(LocalDate startDate, LocalDate endDate, long totalTasks,
                                 long completedTasks, long totalScheduledMinutes, long completedMinutes,
                                 double completionPercentage, List<DailySummaryResponse> dailyBreakdown,
                                 List<SubjectProgressResponse> subjectBreakdown) {
        this.startDate = startDate;
        this.endDate = endDate;
        this.totalTasks = totalTasks;
        this.completedTasks = completedTasks;
        this.totalScheduledMinutes = totalScheduledMinutes;
        this.completedMinutes = completedMinutes;
        this.completionPercentage = completionPercentage;
        this.dailyBreakdown = dailyBreakdown;
        this.subjectBreakdown = subjectBreakdown;
    }

    // Getters and Setters

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
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

    public List<DailySummaryResponse> getDailyBreakdown() {
        return dailyBreakdown;
    }

    public void setDailyBreakdown(List<DailySummaryResponse> dailyBreakdown) {
        this.dailyBreakdown = dailyBreakdown;
    }

    public List<SubjectProgressResponse> getSubjectBreakdown() {
        return subjectBreakdown;
    }

    public void setSubjectBreakdown(List<SubjectProgressResponse> subjectBreakdown) {
        this.subjectBreakdown = subjectBreakdown;
    }
}
