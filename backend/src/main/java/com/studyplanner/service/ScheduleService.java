package com.studyplanner.service;

import com.studyplanner.dto.*;
import com.studyplanner.exception.ScheduleConflictException;
import com.studyplanner.model.StudyTask;
import com.studyplanner.model.TaskStatus;
import com.studyplanner.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service managing study scheduling logic, overlap detection, conflict validation,
 * and daily/weekly schedule aggregation.
 */
@Service
@Transactional(readOnly = true)
public class ScheduleService {

    private final TaskRepository taskRepository;

    public ScheduleService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    /**
     * Determines whether two study time intervals overlap.
     * Adjacent intervals (e.g. 09:00-10:00 and 10:00-11:00) do NOT overlap.
     *
     * @param start1    Start time of first session
     * @param duration1 Duration in minutes of first session
     * @param start2    Start time of second session
     * @param duration2 Duration in minutes of second session
     * @return true if sessions intersect; false otherwise
     */
    public boolean isOverlapping(LocalTime start1, int duration1, LocalTime start2, int duration2) {
        if (start1 == null || start2 == null || duration1 <= 0 || duration2 <= 0) {
            return false;
        }

        LocalTime end1 = start1.plusMinutes(duration1);
        LocalTime end2 = start2.plusMinutes(duration2);

        // Interval 1 is [start1, end1) and Interval 2 is [start2, end2)
        // They overlap if start1 < end2 and start2 < end1
        return start1.isBefore(end2) && start2.isBefore(end1);
    }

    /**
     * Finds any tasks on the given date that overlap with the proposed time slot,
     * optionally excluding a task ID (used when updating/rescheduling an existing task).
     */
    public List<StudyTask> findConflictingTasks(LocalDate date, LocalTime startTime,
                                                int durationMinutes, Long excludeTaskId) {
        if (date == null || startTime == null || durationMinutes <= 0) {
            return Collections.emptyList();
        }

        List<StudyTask> dayTasks = taskRepository.findByScheduledDateOrderByStartTimeAsc(date);
        List<StudyTask> conflicts = new ArrayList<>();

        for (StudyTask task : dayTasks) {
            if (excludeTaskId != null && task.getId().equals(excludeTaskId)) {
                // Exclude the task being edited from its own conflict check
                continue;
            }

            if (isOverlapping(task.getStartTime(), task.getDurationMinutes(), startTime, durationMinutes)) {
                conflicts.add(task);
            }
        }

        return conflicts;
    }

    /**
     * Validates that a proposed schedule slot has no conflicts.
     * Throws ScheduleConflictException if an overlap is detected.
     */
    public void validateNoConflict(LocalDate date, LocalTime startTime, int durationMinutes, Long excludeTaskId) {
        List<StudyTask> conflicts = findConflictingTasks(date, startTime, durationMinutes, excludeTaskId);
        if (!conflicts.isEmpty()) {
            StudyTask firstConflict = conflicts.get(0);
            String message = String.format(
                    "Scheduling conflict detected: overlaps with existing task '%s' (%s to %s) on %s",
                    firstConflict.getTitle(),
                    firstConflict.getStartTime(),
                    firstConflict.getEndTime(),
                    date
            );
            throw new ScheduleConflictException(message);
        }
    }

    /**
     * Public validation endpoint logic returning a validation result DTO.
     */
    public ScheduleValidateResponse validateSchedule(ScheduleValidateRequest request) {
        List<StudyTask> conflicts = findConflictingTasks(
                request.getScheduledDate(),
                request.getStartTime(),
                request.getDurationMinutes(),
                request.getExcludeTaskId()
        );

        if (conflicts.isEmpty()) {
            return new ScheduleValidateResponse(true, "No schedule conflicts detected. Time slot is available.", Collections.emptyList());
        }

        List<TaskResponse> conflictDtos = conflicts.stream()
                .map(TaskResponse::fromEntity)
                .collect(Collectors.toList());

        String message = String.format("Found %d conflicting task(s) for the proposed time slot.", conflicts.size());
        return new ScheduleValidateResponse(false, message, conflictDtos);
    }

    /**
     * Retrieves the schedule for a specific date.
     */
    public DayScheduleResponse getDaySchedule(LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }

        List<StudyTask> tasks = taskRepository.findByScheduledDateOrderByStartTimeAsc(date);
        List<TaskResponse> taskResponses = tasks.stream()
                .map(TaskResponse::fromEntity)
                .collect(Collectors.toList());

        int totalTasks = tasks.size();
        int totalMinutes = 0;
        int completedMinutes = 0;
        Map<String, Integer> subjectMinutes = new LinkedHashMap<>();

        for (StudyTask task : tasks) {
            int duration = task.getDurationMinutes() != null ? task.getDurationMinutes() : 0;
            totalMinutes += duration;
            if (task.getStatus() == TaskStatus.COMPLETED) {
                completedMinutes += duration;
            }

            String subjectName = task.getSubject() != null ? task.getSubject().getName() : "Unknown";
            subjectMinutes.put(subjectName, subjectMinutes.getOrDefault(subjectName, 0) + duration);
        }

        return new DayScheduleResponse(date, totalTasks, totalMinutes, completedMinutes, taskResponses, subjectMinutes);
    }

    /**
     * Retrieves a 7-day schedule starting from the specified date.
     * If startDate is null, defaults to the current week's Monday.
     */
    public WeekScheduleResponse getWeekSchedule(LocalDate startDate) {
        if (startDate == null) {
            startDate = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        }

        LocalDate endDate = startDate.plusDays(6);
        List<DayScheduleResponse> daySchedules = new ArrayList<>();
        Map<String, Integer> weeklySubjectMinutes = new LinkedHashMap<>();

        int totalWeekTasks = 0;
        int totalWeekMinutes = 0;
        int completedWeekMinutes = 0;

        for (int i = 0; i < 7; i++) {
            LocalDate currentDay = startDate.plusDays(i);
            DayScheduleResponse daySchedule = getDaySchedule(currentDay);
            daySchedules.add(daySchedule);

            totalWeekTasks += daySchedule.getTotalTasks();
            totalWeekMinutes += daySchedule.getTotalMinutes();
            completedWeekMinutes += daySchedule.getCompletedMinutes();

            // Accumulate weekly subject minutes
            for (Map.Entry<String, Integer> entry : daySchedule.getSubjectMinutes().entrySet()) {
                weeklySubjectMinutes.put(
                        entry.getKey(),
                        weeklySubjectMinutes.getOrDefault(entry.getKey(), 0) + entry.getValue()
                );
            }
        }

        return new WeekScheduleResponse(
                startDate,
                endDate,
                totalWeekTasks,
                totalWeekMinutes,
                completedWeekMinutes,
                daySchedules,
                weeklySubjectMinutes
        );
    }
}
