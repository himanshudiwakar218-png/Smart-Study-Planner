package com.studyplanner.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Schedule details for a specific day.
 */
public class DayScheduleResponse {

    private LocalDate date;
    private int totalTasks;
    private int totalMinutes;
    private int completedMinutes;
    private List<TaskResponse> tasks;
    private Map<String, Integer> subjectMinutes;

    public DayScheduleResponse() {
    }

    public DayScheduleResponse(LocalDate date, int totalTasks, int totalMinutes,
                               int completedMinutes, List<TaskResponse> tasks,
                               Map<String, Integer> subjectMinutes) {
        this.date = date;
        this.totalTasks = totalTasks;
        this.totalMinutes = totalMinutes;
        this.completedMinutes = completedMinutes;
        this.tasks = tasks;
        this.subjectMinutes = subjectMinutes;
    }

    // Getters and Setters

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public int getTotalTasks() {
        return totalTasks;
    }

    public void setTotalTasks(int totalTasks) {
        this.totalTasks = totalTasks;
    }

    public int getTotalMinutes() {
        return totalMinutes;
    }

    public void setTotalMinutes(int totalMinutes) {
        this.totalMinutes = totalMinutes;
    }

    public int getCompletedMinutes() {
        return completedMinutes;
    }

    public void setCompletedMinutes(int completedMinutes) {
        this.completedMinutes = completedMinutes;
    }

    public List<TaskResponse> getTasks() {
        return tasks;
    }

    public void setTasks(List<TaskResponse> tasks) {
        this.tasks = tasks;
    }

    public Map<String, Integer> getSubjectMinutes() {
        return subjectMinutes;
    }

    public void setSubjectMinutes(Map<String, Integer> subjectMinutes) {
        this.subjectMinutes = subjectMinutes;
    }
}
