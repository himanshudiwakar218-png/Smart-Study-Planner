package com.studyplanner.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 7-day schedule with daily breakdowns and subject minute summaries.
 */
public class WeekScheduleResponse {

    private LocalDate startDate;
    private LocalDate endDate;
    private int totalWeekTasks;
    private int totalWeekMinutes;
    private int completedWeekMinutes;
    private List<DayScheduleResponse> days;
    private Map<String, Integer> subjectMinutes;

    public WeekScheduleResponse() {
    }

    public WeekScheduleResponse(LocalDate startDate, LocalDate endDate, int totalWeekTasks,
                                int totalWeekMinutes, int completedWeekMinutes,
                                List<DayScheduleResponse> days, Map<String, Integer> subjectMinutes) {
        this.startDate = startDate;
        this.endDate = endDate;
        this.totalWeekTasks = totalWeekTasks;
        this.totalWeekMinutes = totalWeekMinutes;
        this.completedWeekMinutes = completedWeekMinutes;
        this.days = days;
        this.subjectMinutes = subjectMinutes;
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

    public int getTotalWeekTasks() {
        return totalWeekTasks;
    }

    public void setTotalWeekTasks(int totalWeekTasks) {
        this.totalWeekTasks = totalWeekTasks;
    }

    public int getTotalWeekMinutes() {
        return totalWeekMinutes;
    }

    public void setTotalWeekMinutes(int totalWeekMinutes) {
        this.totalWeekMinutes = totalWeekMinutes;
    }

    public int getCompletedWeekMinutes() {
        return completedWeekMinutes;
    }

    public void setCompletedWeekMinutes(int completedWeekMinutes) {
        this.completedWeekMinutes = completedWeekMinutes;
    }

    public List<DayScheduleResponse> getDays() {
        return days;
    }

    public void setDays(List<DayScheduleResponse> days) {
        this.days = days;
    }

    public Map<String, Integer> getSubjectMinutes() {
        return subjectMinutes;
    }

    public void setSubjectMinutes(Map<String, Integer> subjectMinutes) {
        this.subjectMinutes = subjectMinutes;
    }
}
