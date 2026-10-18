package com.studyplanner;

import com.studyplanner.dto.TaskRequest;
import com.studyplanner.dto.TaskResponse;
import com.studyplanner.exception.InvalidRequestException;
import com.studyplanner.exception.ResourceNotFoundException;
import com.studyplanner.model.Priority;
import com.studyplanner.model.StudyTask;
import com.studyplanner.model.Subject;
import com.studyplanner.model.TaskStatus;
import com.studyplanner.repository.SubjectRepository;
import com.studyplanner.repository.TaskRepository;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudyServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private ScheduleService scheduleService;

    @InjectMocks
    private StudyService studyService;

    private Subject dsaSubject;
    private StudyTask sampleTask;
    private LocalDate testDate;

    @BeforeEach
    void setUp() {
        dsaSubject = new Subject(1L, "Data Structures", "Trees, Graphs", 10.0);
        testDate = LocalDate.now().plusDays(1);
        sampleTask = new StudyTask(
                "Binary Search Trees", "Implement BST insert and delete",
                dsaSubject, testDate, LocalTime.of(14, 0), 90, Priority.HIGH, TaskStatus.PENDING
        );
        sampleTask.setId(10L);
    }

    @Test
    @DisplayName("Create study task successfully when valid and no conflict")
    void testCreateTaskSuccess() {
        TaskRequest request = new TaskRequest(
                "Binary Search Trees", "Implement BST insert and delete",
                1L, testDate, LocalTime.of(14, 0), 90, Priority.HIGH, TaskStatus.PENDING
        );

        when(subjectRepository.findById(1L)).thenReturn(Optional.of(dsaSubject));
        doNothing().when(scheduleService).validateNoConflict(testDate, LocalTime.of(14, 0), 90, null);
        when(taskRepository.save(any(StudyTask.class))).thenReturn(sampleTask);

        TaskResponse response = studyService.createTask(request);

        assertNotNull(response);
        assertEquals("Binary Search Trees", response.getTitle());
        assertEquals(90, response.getDurationMinutes());
        assertEquals("Data Structures", response.getSubjectName());
        verify(scheduleService, times(1)).validateNoConflict(testDate, LocalTime.of(14, 0), 90, null);
    }

    @Test
    @DisplayName("Task duration must be positive - reject duration <= 0")
    void testCreateTaskWithNonPositiveDurationThrows() {
        TaskRequest request = new TaskRequest(
                "Binary Search Trees", "Description",
                1L, testDate, LocalTime.of(14, 0), 0, Priority.HIGH, TaskStatus.PENDING
        );

        assertThrows(InvalidRequestException.class, () -> studyService.createTask(request));
        verify(taskRepository, never()).save(any(StudyTask.class));
    }

    @Test
    @DisplayName("Task creation throws ResourceNotFoundException if subject ID does not exist")
    void testCreateTaskWithNonExistentSubjectThrows() {
        TaskRequest request = new TaskRequest(
                "Binary Search Trees", "Description",
                999L, testDate, LocalTime.of(14, 0), 60, Priority.HIGH, TaskStatus.PENDING
        );

        when(subjectRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> studyService.createTask(request));
    }

    @Test
    @DisplayName("Mark task as completed sets status to COMPLETED and records completedAt timestamp")
    void testCompleteTask() {
        when(taskRepository.findById(10L)).thenReturn(Optional.of(sampleTask));
        when(taskRepository.save(any(StudyTask.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaskResponse response = studyService.completeTask(10L);

        assertEquals(TaskStatus.COMPLETED, response.getStatus());
        assertNotNull(response.getCompletedAt(), "Completion timestamp must be set");
    }

    @Test
    @DisplayName("Reopen task resets status to PENDING and clears completedAt timestamp")
    void testReopenTask() {
        sampleTask.setStatus(TaskStatus.COMPLETED);
        sampleTask.setCompletedAt(java.time.LocalDateTime.now());

        when(taskRepository.findById(10L)).thenReturn(Optional.of(sampleTask));
        when(taskRepository.save(any(StudyTask.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaskResponse response = studyService.reopenTask(10L);

        assertEquals(TaskStatus.PENDING, response.getStatus());
        assertNull(response.getCompletedAt(), "Completion timestamp must be cleared on reopen");
    }

    @Test
    @DisplayName("Overdue task detection identifies past dates and past times on current day")
    void testOverdueTaskDetection() {
        LocalDate today = LocalDate.of(2026, 10, 15);
        LocalTime now = LocalTime.of(15, 0);

        // Task scheduled yesterday and not completed is overdue
        StudyTask yesterdayTask = new StudyTask("Past Task", null, dsaSubject,
                today.minusDays(1), LocalTime.of(10, 0), 60, Priority.MEDIUM, TaskStatus.PENDING);
        assertTrue(studyService.isTaskOverdue(yesterdayTask, today, now));

        // Task scheduled earlier today that already ended is overdue
        StudyTask earlierTodayTask = new StudyTask("Morning Task", null, dsaSubject,
                today, LocalTime.of(9, 0), 60, Priority.MEDIUM, TaskStatus.PENDING);
        assertTrue(studyService.isTaskOverdue(earlierTodayTask, today, now));

        // Task scheduled for later today is NOT overdue
        StudyTask laterTodayTask = new StudyTask("Evening Task", null, dsaSubject,
                today, LocalTime.of(18, 0), 60, Priority.MEDIUM, TaskStatus.PENDING);
        assertFalse(studyService.isTaskOverdue(laterTodayTask, today, now));

        // Completed task is NEVER overdue
        yesterdayTask.setStatus(TaskStatus.COMPLETED);
        assertFalse(studyService.isTaskOverdue(yesterdayTask, today, now));
    }
}
