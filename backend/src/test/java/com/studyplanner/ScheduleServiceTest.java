package com.studyplanner;

import com.studyplanner.dto.DayScheduleResponse;
import com.studyplanner.dto.ScheduleValidateRequest;
import com.studyplanner.dto.ScheduleValidateResponse;
import com.studyplanner.dto.WeekScheduleResponse;
import com.studyplanner.exception.ScheduleConflictException;
import com.studyplanner.model.Priority;
import com.studyplanner.model.StudyTask;
import com.studyplanner.model.Subject;
import com.studyplanner.model.TaskStatus;
import com.studyplanner.repository.TaskRepository;
import com.studyplanner.service.ScheduleService;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScheduleServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private ScheduleService scheduleService;

    private Subject mathSubject;
    private LocalDate testDate;

    @BeforeEach
    void setUp() {
        mathSubject = new Subject(1L, "Mathematics", "Calculus and Algebra", 10.0);
        testDate = LocalDate.of(2026, 10, 20);
    }

    @Test
    @DisplayName("Adjacent tasks should NOT conflict (e.g. 10:00-11:00 and 11:00-12:00)")
    void testAdjacentTasksDoNotConflict() {
        LocalTime start1 = LocalTime.of(10, 0);
        int duration1 = 60; // Ends at 11:00

        LocalTime start2 = LocalTime.of(11, 0);
        int duration2 = 60; // Starts at 11:00

        assertFalse(scheduleService.isOverlapping(start1, duration1, start2, duration2),
                "Task starting exactly when another ends should not conflict");
        assertFalse(scheduleService.isOverlapping(start2, duration2, start1, duration1),
                "Commutative adjacent check should also not conflict");
    }

    @Test
    @DisplayName("Overlapping tasks should be detected (e.g. 10:00-11:30 and 11:00-12:00)")
    void testOverlappingTasksDetected() {
        LocalTime start1 = LocalTime.of(10, 0);
        int duration1 = 90; // Ends at 11:30

        LocalTime start2 = LocalTime.of(11, 0);
        int duration2 = 60; // 11:00 to 12:00

        assertTrue(scheduleService.isOverlapping(start1, duration1, start2, duration2),
                "Tasks with intersecting time intervals must be detected as overlapping");
    }

    @Test
    @DisplayName("Non-overlapping separated tasks should return false")
    void testSeparatedTasksDoNotOverlap() {
        LocalTime start1 = LocalTime.of(9, 0);
        int duration1 = 60; // Ends at 10:00

        LocalTime start2 = LocalTime.of(14, 0);
        int duration2 = 60; // Starts at 14:00

        assertFalse(scheduleService.isOverlapping(start1, duration1, start2, duration2));
    }

    @Test
    @DisplayName("One task contained entirely inside another should overlap")
    void testContainedTaskOverlaps() {
        LocalTime start1 = LocalTime.of(9, 0);
        int duration1 = 180; // 09:00 - 12:00

        LocalTime start2 = LocalTime.of(10, 0);
        int duration2 = 60; // 10:00 - 11:00

        assertTrue(scheduleService.isOverlapping(start1, duration1, start2, duration2));
    }

    @Test
    @DisplayName("ValidateNoConflict throws ScheduleConflictException when conflict exists")
    void testValidateNoConflictThrowsOnOverlap() {
        StudyTask existingTask = new StudyTask(
                "Linear Algebra", "Matrix multiplication", mathSubject,
                testDate, LocalTime.of(10, 0), 60, Priority.HIGH, TaskStatus.PENDING
        );
        existingTask.setId(101L);

        when(taskRepository.findByScheduledDateOrderByStartTimeAsc(testDate))
                .thenReturn(List.of(existingTask));

        // Attempting to schedule 10:30 - 11:30 (overlaps with 10:00-11:00)
        assertThrows(ScheduleConflictException.class, () ->
                scheduleService.validateNoConflict(testDate, LocalTime.of(10, 30), 60, null)
        );
    }

    @Test
    @DisplayName("ValidateNoConflict excludes task being edited from its own conflict check")
    void testValidateNoConflictExcludesSelf() {
        StudyTask existingTask = new StudyTask(
                "Linear Algebra", "Matrix multiplication", mathSubject,
                testDate, LocalTime.of(10, 0), 60, Priority.HIGH, TaskStatus.PENDING
        );
        existingTask.setId(101L);

        when(taskRepository.findByScheduledDateOrderByStartTimeAsc(testDate))
                .thenReturn(List.of(existingTask));

        // Editing task 101 itself to same or slightly different time slot should NOT conflict with itself
        assertDoesNotThrow(() ->
                scheduleService.validateNoConflict(testDate, LocalTime.of(10, 0), 60, 101L)
        );
    }

    @Test
    @DisplayName("ValidateSchedule returns valid response when no conflicts exist")
    void testValidateScheduleReturnsValidResponse() {
        when(taskRepository.findByScheduledDateOrderByStartTimeAsc(testDate))
                .thenReturn(Collections.emptyList());

        ScheduleValidateRequest request = new ScheduleValidateRequest(
                testDate, LocalTime.of(10, 0), 60, null
        );

        ScheduleValidateResponse response = scheduleService.validateSchedule(request);
        assertTrue(response.isValid());
        assertTrue(response.getConflicts().isEmpty());
    }

    @Test
    @DisplayName("GetDaySchedule aggregates total and subject minutes correctly")
    void testGetDayScheduleAggregatesCorrectly() {
        StudyTask task1 = new StudyTask(
                "Algebra Chapter 1", null, mathSubject,
                testDate, LocalTime.of(9, 0), 60, Priority.MEDIUM, TaskStatus.COMPLETED
        );
        task1.setId(1L);

        StudyTask task2 = new StudyTask(
                "Algebra Chapter 2", null, mathSubject,
                testDate, LocalTime.of(11, 0), 90, Priority.HIGH, TaskStatus.PENDING
        );
        task2.setId(2L);

        when(taskRepository.findByScheduledDateOrderByStartTimeAsc(testDate))
                .thenReturn(List.of(task1, task2));

        DayScheduleResponse daySchedule = scheduleService.getDaySchedule(testDate);

        assertEquals(2, daySchedule.getTotalTasks());
        assertEquals(150, daySchedule.getTotalMinutes());
        assertEquals(60, daySchedule.getCompletedMinutes());
        assertEquals(150, daySchedule.getSubjectMinutes().get("Mathematics"));
    }
}
