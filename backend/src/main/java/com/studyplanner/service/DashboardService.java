package com.studyplanner.service;

import com.studyplanner.dto.DailySummaryResponse;
import com.studyplanner.dto.DashboardSummaryResponse;
import com.studyplanner.dto.SubjectProgressResponse;
import com.studyplanner.dto.WeeklySummaryResponse;
import com.studyplanner.model.StudyTask;
import com.studyplanner.model.Subject;
import com.studyplanner.model.TaskStatus;
import com.studyplanner.repository.SubjectRepository;
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
 * Service calculating real-time dashboard analytics, summaries, and progress percentages
 * directly from stored database entities.
 */
@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final TaskRepository taskRepository;
    private final SubjectRepository subjectRepository;
    private final StudyService studyService;
    private final ScheduleService scheduleService;

    public DashboardService(TaskRepository taskRepository, SubjectRepository subjectRepository,
                            StudyService studyService, ScheduleService scheduleService) {
        this.taskRepository = taskRepository;
        this.subjectRepository = subjectRepository;
        this.studyService = studyService;
        this.scheduleService = scheduleService;
    }

    /**
     * Calculates overall dashboard summary metrics.
     * Prevents division-by-zero errors when there are zero tasks.
     */
    public DashboardSummaryResponse getSummary() {
        long totalSubjects = subjectRepository.count();
        List<StudyTask> allTasks = taskRepository.findAll();

        long totalTasks = allTasks.size();
        long pendingTasks = 0;
        long inProgressTasks = 0;
        long completedTasks = 0;
        long overdueTasks = 0;
        long todayScheduledTasks = 0;
        long todayCompletedTasks = 0;
        long totalScheduledMinutes = 0;
        long completedStudyMinutes = 0;

        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        for (StudyTask task : allTasks) {
            int duration = task.getDurationMinutes() != null ? task.getDurationMinutes() : 0;
            totalScheduledMinutes += duration;

            if (task.getStatus() == TaskStatus.PENDING) {
                pendingTasks++;
            } else if (task.getStatus() == TaskStatus.IN_PROGRESS) {
                inProgressTasks++;
            } else if (task.getStatus() == TaskStatus.COMPLETED) {
                completedTasks++;
                completedStudyMinutes += duration;
            }

            if (studyService.isTaskOverdue(task, today, now)) {
                overdueTasks++;
            }

            if (today.equals(task.getScheduledDate())) {
                todayScheduledTasks++;
                if (task.getStatus() == TaskStatus.COMPLETED) {
                    todayCompletedTasks++;
                }
            }
        }

        double overallCompletionPercentage = calculatePercentage(completedTasks, totalTasks);

        return new DashboardSummaryResponse(
                totalSubjects,
                totalTasks,
                pendingTasks,
                inProgressTasks,
                completedTasks,
                overdueTasks,
                todayScheduledTasks,
                todayCompletedTasks,
                totalScheduledMinutes,
                completedStudyMinutes,
                overallCompletionPercentage
        );
    }

    /**
     * Calculates subject-wise task completion percentages and study durations.
     */
    public List<SubjectProgressResponse> getSubjectProgress() {
        List<Subject> subjects = subjectRepository.findAll();
        List<StudyTask> allTasks = taskRepository.findAll();

        Map<Long, List<StudyTask>> tasksBySubject = allTasks.stream()
                .filter(t -> t.getSubject() != null && t.getSubject().getId() != null)
                .collect(Collectors.groupingBy(t -> t.getSubject().getId()));

        List<SubjectProgressResponse> progressList = new ArrayList<>();

        for (Subject subject : subjects) {
            List<StudyTask> subjectTasks = tasksBySubject.getOrDefault(subject.getId(), Collections.emptyList());

            long totalTasks = subjectTasks.size();
            long completedTasks = 0;
            long pendingTasks = 0;
            long inProgressTasks = 0;
            long totalScheduledMinutes = 0;
            long completedMinutes = 0;

            for (StudyTask task : subjectTasks) {
                int duration = task.getDurationMinutes() != null ? task.getDurationMinutes() : 0;
                totalScheduledMinutes += duration;

                if (task.getStatus() == TaskStatus.COMPLETED) {
                    completedTasks++;
                    completedMinutes += duration;
                } else if (task.getStatus() == TaskStatus.IN_PROGRESS) {
                    inProgressTasks++;
                } else {
                    pendingTasks++;
                }
            }

            double completionPercentage = calculatePercentage(completedTasks, totalTasks);

            progressList.add(new SubjectProgressResponse(
                    subject.getId(),
                    subject.getName(),
                    subject.getTargetWeeklyHours(),
                    totalTasks,
                    completedTasks,
                    pendingTasks,
                    inProgressTasks,
                    completionPercentage,
                    totalScheduledMinutes,
                    completedMinutes
            ));
        }

        return progressList;
    }

    /**
     * Calculates daily study summary for a specific date.
     */
    public DailySummaryResponse getDailySummary(LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }

        var daySchedule = scheduleService.getDaySchedule(date);
        List<StudyTask> tasks = taskRepository.findByScheduledDateOrderByStartTimeAsc(date);

        long totalTasks = tasks.size();
        long completedTasks = 0;
        long pendingTasks = 0;
        long inProgressTasks = 0;
        long totalScheduledMinutes = 0;
        long completedMinutes = 0;

        for (StudyTask task : tasks) {
            int duration = task.getDurationMinutes() != null ? task.getDurationMinutes() : 0;
            totalScheduledMinutes += duration;

            if (task.getStatus() == TaskStatus.COMPLETED) {
                completedTasks++;
                completedMinutes += duration;
            } else if (task.getStatus() == TaskStatus.IN_PROGRESS) {
                inProgressTasks++;
            } else {
                pendingTasks++;
            }
        }

        double completionPercentage = calculatePercentage(completedTasks, totalTasks);

        return new DailySummaryResponse(
                date,
                totalTasks,
                completedTasks,
                pendingTasks,
                inProgressTasks,
                totalScheduledMinutes,
                completedMinutes,
                completionPercentage,
                daySchedule.getTasks()
        );
    }

    /**
     * Calculates 7-day weekly study summary with daily and subject breakdowns.
     */
    public WeeklySummaryResponse getWeeklySummary(LocalDate startDate) {
        if (startDate == null) {
            startDate = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        }

        LocalDate endDate = startDate.plusDays(6);
        List<DailySummaryResponse> dailyBreakdown = new ArrayList<>();

        long totalWeekTasks = 0;
        long completedWeekTasks = 0;
        long totalScheduledMinutes = 0;
        long completedMinutes = 0;

        for (int i = 0; i < 7; i++) {
            LocalDate currentDay = startDate.plusDays(i);
            DailySummaryResponse daySummary = getDailySummary(currentDay);
            dailyBreakdown.add(daySummary);

            totalWeekTasks += daySummary.getTotalTasks();
            completedWeekTasks += daySummary.getCompletedTasks();
            totalScheduledMinutes += daySummary.getTotalScheduledMinutes();
            completedMinutes += daySummary.getCompletedMinutes();
        }

        double weekCompletionPercentage = calculatePercentage(completedWeekTasks, totalWeekTasks);

        // Subject breakdown for the specified week
        List<StudyTask> weekTasks = taskRepository.findByScheduledDateBetweenOrderByScheduledDateAscStartTimeAsc(startDate, endDate);
        List<Subject> allSubjects = subjectRepository.findAll();

        Map<Long, List<StudyTask>> weekTasksBySubject = weekTasks.stream()
                .filter(t -> t.getSubject() != null && t.getSubject().getId() != null)
                .collect(Collectors.groupingBy(t -> t.getSubject().getId()));

        List<SubjectProgressResponse> subjectBreakdown = new ArrayList<>();
        for (Subject subject : allSubjects) {
            List<StudyTask> subTasks = weekTasksBySubject.getOrDefault(subject.getId(), Collections.emptyList());
            long totalSubTasks = subTasks.size();
            long compSubTasks = 0;
            long pendSubTasks = 0;
            long inProgSubTasks = 0;
            long subTotalMin = 0;
            long subCompMin = 0;

            for (StudyTask task : subTasks) {
                int duration = task.getDurationMinutes() != null ? task.getDurationMinutes() : 0;
                subTotalMin += duration;
                if (task.getStatus() == TaskStatus.COMPLETED) {
                    compSubTasks++;
                    subCompMin += duration;
                } else if (task.getStatus() == TaskStatus.IN_PROGRESS) {
                    inProgSubTasks++;
                } else {
                    pendSubTasks++;
                }
            }

            double subPercentage = calculatePercentage(compSubTasks, totalSubTasks);

            subjectBreakdown.add(new SubjectProgressResponse(
                    subject.getId(),
                    subject.getName(),
                    subject.getTargetWeeklyHours(),
                    totalSubTasks,
                    compSubTasks,
                    pendSubTasks,
                    inProgSubTasks,
                    subPercentage,
                    subTotalMin,
                    subCompMin
            ));
        }

        return new WeeklySummaryResponse(
                startDate,
                endDate,
                totalWeekTasks,
                completedWeekTasks,
                totalScheduledMinutes,
                completedMinutes,
                weekCompletionPercentage,
                dailyBreakdown,
                subjectBreakdown
        );
    }

    /**
     * Safely calculates percentage, returning 0.0 when total is 0 to avoid division-by-zero errors.
     */
    private double calculatePercentage(long part, long total) {
        if (total <= 0) {
            return 0.0;
        }
        double percentage = (part * 100.0) / total;
        return Math.round(percentage * 10.0) / 10.0;
    }
}
