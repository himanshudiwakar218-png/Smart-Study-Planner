package com.studyplanner;

import com.studyplanner.dto.DashboardSummaryResponse;
import com.studyplanner.dto.SubjectProgressResponse;
import com.studyplanner.model.Priority;
import com.studyplanner.model.StudyTask;
import com.studyplanner.model.Subject;
import com.studyplanner.model.TaskStatus;
import com.studyplanner.repository.SubjectRepository;
import com.studyplanner.repository.TaskRepository;
import com.studyplanner.service.DashboardService;
import com.studyplanner.service.ScheduleService;
import com.studyplanner.service.StudyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private StudyService studyService;

    @Mock
    private ScheduleService scheduleService;

    @InjectMocks
    private DashboardService dashboardService;

    private Subject subject1;
    private Subject subject2;

    @BeforeEach
    void setUp() {
        subject1 = new Subject(1L, "Java", "Java core", 6.0);
        subject2 = new Subject(2L, "Databases", "SQL and SQLite", 4.0);
    }

    @Test
    @DisplayName("Summary returns 0.0% completion and does NOT throw division-by-zero when no tasks exist")
    void testSummaryWithZeroTasks() {
        when(subjectRepository.count()).thenReturn(2L);
        when(taskRepository.findAll()).thenReturn(Collections.emptyList());

        DashboardSummaryResponse summary = dashboardService.getSummary();

        assertEquals(2, summary.getTotalSubjects());
        assertEquals(0, summary.getTotalTasks());
        assertEquals(0.0, summary.getOverallCompletionPercentage());
        assertEquals(0, summary.getTotalScheduledMinutes());
        assertEquals(0, summary.getCompletedStudyMinutes());
    }

    @Test
    @DisplayName("Summary correctly calculates task counts, completion percentage, and minutes")
    void testSummaryWithTasks() {
        LocalDate today = LocalDate.now();

        StudyTask task1 = new StudyTask("Task 1", null, subject1, today, LocalTime.of(9, 0), 60, Priority.HIGH, TaskStatus.COMPLETED);
        StudyTask task2 = new StudyTask("Task 2", null, subject1, today, LocalTime.of(11, 0), 90, Priority.MEDIUM, TaskStatus.PENDING);
        StudyTask task3 = new StudyTask("Task 3", null, subject2, today, LocalTime.of(14, 0), 30, Priority.LOW, TaskStatus.IN_PROGRESS);

        when(subjectRepository.count()).thenReturn(2L);
        when(taskRepository.findAll()).thenReturn(List.of(task1, task2, task3));
        when(studyService.isTaskOverdue(any(), any(), any())).thenReturn(false);

        DashboardSummaryResponse summary = dashboardService.getSummary();

        assertEquals(3, summary.getTotalTasks());
        assertEquals(1, summary.getCompletedTasks());
        assertEquals(1, summary.getPendingTasks());
        assertEquals(1, summary.getInProgressTasks());
        assertEquals(180, summary.getTotalScheduledMinutes()); // 60 + 90 + 30
        assertEquals(60, summary.getCompletedStudyMinutes());
        assertEquals(33.3, summary.getOverallCompletionPercentage());
    }

    @Test
    @DisplayName("Subject progress correctly calculates subject-wise completion percentage")
    void testSubjectProgressCalculations() {
        LocalDate today = LocalDate.now();

        StudyTask task1 = new StudyTask("Java Task 1", null, subject1, today, LocalTime.of(9, 0), 60, Priority.HIGH, TaskStatus.COMPLETED);
        StudyTask task2 = new StudyTask("Java Task 2", null, subject1, today, LocalTime.of(11, 0), 60, Priority.MEDIUM, TaskStatus.COMPLETED);
        StudyTask dbTask = new StudyTask("DB Task 1", null, subject2, today, LocalTime.of(14, 0), 45, Priority.LOW, TaskStatus.PENDING);

        when(subjectRepository.findAll()).thenReturn(List.of(subject1, subject2));
        when(taskRepository.findAll()).thenReturn(List.of(task1, task2, dbTask));

        List<SubjectProgressResponse> progressList = dashboardService.getSubjectProgress();

        assertEquals(2, progressList.size());

        SubjectProgressResponse javaProgress = progressList.get(0);
        assertEquals("Java", javaProgress.getSubjectName());
        assertEquals(2, javaProgress.getTotalTasks());
        assertEquals(2, javaProgress.getCompletedTasks());
        assertEquals(100.0, javaProgress.getCompletionPercentage());
        assertEquals(120, javaProgress.getCompletedMinutes());

        SubjectProgressResponse dbProgress = progressList.get(1);
        assertEquals("Databases", dbProgress.getSubjectName());
        assertEquals(1, dbProgress.getTotalTasks());
        assertEquals(0, dbProgress.getCompletedTasks());
        assertEquals(0.0, dbProgress.getCompletionPercentage());
    }
}
