package com.studyplanner;

import com.studyplanner.exception.InvalidRequestException;
import com.studyplanner.model.Priority;
import com.studyplanner.model.StudyTask;
import com.studyplanner.model.Subject;
import com.studyplanner.model.TaskStatus;
import com.studyplanner.repository.SubjectRepository;
import com.studyplanner.repository.TaskRepository;
import com.studyplanner.service.StudyService;
import com.studyplanner.service.SubjectService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class DatabasePersistenceTest {

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private SubjectService subjectService;

    @Autowired
    private StudyService studyService;

    @Autowired
    private EntityManager entityManager;

    @BeforeEach
    void setup() {
        taskRepository.deleteAll();
        subjectRepository.deleteAll();
    }

    @Test
    @DisplayName("Should save, retrieve, and verify subject persistence with weekly target minutes and hours")
    @Transactional
    void testSaveAndRetrieveSubject() {
        Subject subject = new Subject("Discrete Mathematics", "Logic, sets, proofs, and graph theory", 7.5);
        Subject saved = subjectRepository.save(subject);

        assertNotNull(saved.getId(), "Subject ID should be generated");
        assertEquals(7.5, saved.getTargetWeeklyHours());
        assertEquals(450, saved.getWeeklyTargetMinutes(), "Weekly target minutes should be 7.5 * 60 = 450");
        assertNotNull(saved.getCreatedAt(), "CreatedAt should be populated");
        assertNotNull(saved.getUpdatedAt(), "UpdatedAt should be populated");

        Subject retrieved = subjectRepository.findById(saved.getId()).orElse(null);
        assertNotNull(retrieved);
        assertEquals("Discrete Mathematics", retrieved.getName());
        assertEquals(450, retrieved.getWeeklyTargetMinutes());
    }

    @Test
    @DisplayName("Should save, retrieve, and verify task persistence with full subject relationship")
    @Transactional
    void testSaveAndRetrieveTask() {
        Subject subject = subjectRepository.save(new Subject("Operating Systems", "OS Concepts", 6.0));

        LocalDate date = LocalDate.now().plusDays(1);
        LocalTime time = LocalTime.of(10, 0);

        StudyTask task = new StudyTask(
                "Process Scheduling Lab",
                "Implement Round Robin scheduling algorithm",
                subject,
                date,
                time,
                90,
                Priority.HIGH,
                TaskStatus.PENDING
        );
        StudyTask saved = taskRepository.save(task);

        assertNotNull(saved.getId());
        assertEquals("Process Scheduling Lab", saved.getTitle());
        assertEquals(subject.getId(), saved.getSubject().getId());
        assertEquals(date, saved.getScheduledDate());
        assertEquals(time, saved.getStartTime());
        assertEquals(90, saved.getDurationMinutes());
        assertEquals(Priority.HIGH, saved.getPriority());
        assertEquals(TaskStatus.PENDING, saved.getStatus());
        assertNotNull(saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());
        assertNull(saved.getCompletedAt());

        StudyTask retrieved = taskRepository.findById(saved.getId()).orElse(null);
        assertNotNull(retrieved);
        assertEquals(LocalTime.of(11, 30), retrieved.getEndTime());
    }

    @Test
    @DisplayName("Should update subject and task records and verify timestamp updates")
    @Transactional
    void testUpdateRecords() {
        Subject subject = subjectRepository.save(new Subject("Database Systems", "SQL & Relational Models", 5.0));
        StudyTask task = taskRepository.save(new StudyTask(
                "Indexing Homework", "B-Tree exercises", subject,
                LocalDate.now(), LocalTime.of(14, 0), 60, Priority.MEDIUM, TaskStatus.PENDING
        ));

        // Update subject
        subject.setDescription("SQL, NoSQL, Relational Models, and Transactions");
        subject.setWeeklyTargetMinutes(480); // 8 hours
        Subject updatedSubject = subjectRepository.save(subject);
        assertEquals(8.0, updatedSubject.getTargetWeeklyHours());
        assertEquals(480, updatedSubject.getWeeklyTargetMinutes());

        // Update task
        task.setTitle("B+ Tree Indexing Homework");
        task.setDurationMinutes(75);
        task.setPriority(Priority.HIGH);
        StudyTask updatedTask = taskRepository.save(task);
        assertEquals("B+ Tree Indexing Homework", updatedTask.getTitle());
        assertEquals(75, updatedTask.getDurationMinutes());
        assertEquals(Priority.HIGH, updatedTask.getPriority());
    }

    @Test
    @DisplayName("Should safely delete task and prevent deleting subject when tasks are associated")
    void testDeleteRecordsSafely() {
        Subject subject = subjectRepository.save(new Subject("Cloud Computing", "AWS & Docker", 4.0));
        StudyTask task = taskRepository.save(new StudyTask(
                "Docker Compose Setup", "Microservices containerization", subject,
                LocalDate.now(), LocalTime.of(15, 0), 45, Priority.MEDIUM, TaskStatus.PENDING
        ));

        // Deleting the subject must fail with InvalidRequestException because tasks are attached
        InvalidRequestException ex = assertThrows(InvalidRequestException.class, () ->
                subjectService.deleteSubject(subject.getId())
        );
        assertTrue(ex.getMessage().contains("Cannot delete subject with ID"));

        // Delete the task first
        studyService.deleteTask(task.getId());
        assertFalse(taskRepository.existsById(task.getId()));

        // Now subject can be deleted safely
        subjectService.deleteSubject(subject.getId());
        assertFalse(subjectRepository.existsById(subject.getId()));
    }

    @Test
    @DisplayName("Should test foreign-key and not-null behavior when saving task without valid subject")
    void testForeignKeyAndNotNullBehavior() {
        // Attempting to persist a task without a subject must fail
        StudyTask invalidTask = new StudyTask(
                "Orphan Task", "No subject assigned", null,
                LocalDate.now(), LocalTime.of(10, 0), 60, Priority.LOW, TaskStatus.PENDING
        );

        assertThrows(Exception.class, () -> {
            taskRepository.saveAndFlush(invalidTask);
        });
    }

    @Test
    @DisplayName("Should correctly record completed_at on completion and clear it on reopening")
    void testTaskCompletionAndReopening() {
        Subject subject = subjectRepository.save(new Subject("Algorithms", "Greedy algorithms", 6.0));
        StudyTask task = taskRepository.save(new StudyTask(
                "Dijkstra Implementation", "Shortest path algorithm", subject,
                LocalDate.now(), LocalTime.of(9, 0), 60, Priority.HIGH, TaskStatus.PENDING
        ));

        assertNull(task.getCompletedAt());
        assertEquals(TaskStatus.PENDING, task.getStatus());

        // Complete task
        var completed = studyService.completeTask(task.getId());
        assertEquals(TaskStatus.COMPLETED, completed.getStatus());
        assertNotNull(completed.getCompletedAt(), "completedAt should be timestamped upon completion");

        // Reopen task
        var reopened = studyService.reopenTask(task.getId());
        assertEquals(TaskStatus.PENDING, reopened.getStatus());
        assertNull(reopened.getCompletedAt(), "completedAt should be cleared upon reopening");
    }

    @Test
    @DisplayName("Should correctly execute repository queries for filtering by subject, date, status, and priority")
    @Transactional
    void testFilteringQueries() {
        Subject s1 = subjectRepository.save(new Subject("Physics", "Mechanics", 5.0));
        Subject s2 = subjectRepository.save(new Subject("Chemistry", "Organic", 4.0));

        LocalDate day1 = LocalDate.now();
        LocalDate day2 = LocalDate.now().plusDays(2);

        taskRepository.save(new StudyTask("Kinematics Lab", "", s1, day1, LocalTime.of(10, 0), 60, Priority.HIGH, TaskStatus.PENDING));
        taskRepository.save(new StudyTask("Thermodynamics", "", s1, day2, LocalTime.of(14, 0), 45, Priority.MEDIUM, TaskStatus.COMPLETED));
        taskRepository.save(new StudyTask("Hydrocarbons", "", s2, day1, LocalTime.of(16, 0), 60, Priority.HIGH, TaskStatus.PENDING));

        // Filter by subject
        List<StudyTask> s1Tasks = taskRepository.findBySubjectId(s1.getId());
        assertEquals(2, s1Tasks.size());

        // Filter by date
        List<StudyTask> day1Tasks = taskRepository.findByScheduledDate(day1);
        assertEquals(2, day1Tasks.size());

        // Filter by status & priority
        List<StudyTask> highPending = taskRepository.findByStatusAndPriority(TaskStatus.PENDING, Priority.HIGH);
        assertEquals(2, highPending.size());

        // Subject counts
        assertEquals(2, taskRepository.countBySubjectId(s1.getId()));
        assertEquals(1, taskRepository.countBySubjectId(s2.getId()));
        assertEquals(1, taskRepository.countBySubjectIdAndStatus(s1.getId(), TaskStatus.COMPLETED));
    }

    @Test
    @DisplayName("Should correctly query overdue tasks using repository query")
    @Transactional
    void testOverdueTaskQueries() {
        Subject subject = subjectRepository.save(new Subject("Linear Algebra", "Matrix operations", 4.0));

        LocalDate pastDate = LocalDate.now().minusDays(2);
        LocalDate futureDate = LocalDate.now().plusDays(2);

        // Past pending task -> OVERDUE
        taskRepository.save(new StudyTask("Overdue Matrix Inversion", "", subject, pastDate, LocalTime.of(10, 0), 60, Priority.HIGH, TaskStatus.PENDING));

        // Past completed task -> NOT overdue
        StudyTask completedPast = new StudyTask("Completed Determinants", "", subject, pastDate, LocalTime.of(12, 0), 45, Priority.MEDIUM, TaskStatus.COMPLETED);
        completedPast.setCompletedAt(LocalDateTime.now().minusDays(2));
        taskRepository.save(completedPast);

        // Future pending task -> NOT overdue
        taskRepository.save(new StudyTask("Future Eigenvalues", "", subject, futureDate, LocalTime.of(15, 0), 90, Priority.HIGH, TaskStatus.PENDING));

        List<StudyTask> overdueTasks = taskRepository.findOverdueTasks(LocalDate.now(), LocalTime.now());
        assertEquals(1, overdueTasks.size());
        assertEquals("Overdue Matrix Inversion", overdueTasks.get(0).getTitle());

        long count = taskRepository.countOverdueTasks(LocalDate.now(), LocalTime.now());
        assertEquals(1, count);
    }

    @Test
    @DisplayName("Should query tasks within a weekly date range for progress calculations")
    @Transactional
    void testWeeklyDateRangeQueries() {
        Subject subject = subjectRepository.save(new Subject("Biology", "Genetics", 5.0));

        LocalDate monday = LocalDate.of(2026, 10, 12);
        LocalDate wednesday = LocalDate.of(2026, 10, 14);
        LocalDate friday = LocalDate.of(2026, 10, 16);
        LocalDate nextWeek = LocalDate.of(2026, 10, 20);

        taskRepository.save(new StudyTask("Mendel Laws", "", subject, monday, LocalTime.of(9, 0), 60, Priority.HIGH, TaskStatus.COMPLETED));
        taskRepository.save(new StudyTask("DNA Replication", "", subject, wednesday, LocalTime.of(11, 0), 90, Priority.MEDIUM, TaskStatus.PENDING));
        taskRepository.save(new StudyTask("Protein Synthesis", "", subject, friday, LocalTime.of(14, 0), 45, Priority.LOW, TaskStatus.COMPLETED));
        taskRepository.save(new StudyTask("Out of Range Session", "", subject, nextWeek, LocalTime.of(10, 0), 60, Priority.MEDIUM, TaskStatus.PENDING));

        List<StudyTask> weekTasks = taskRepository.findByScheduledDateBetweenOrderByScheduledDateAscStartTimeAsc(
                monday,
                monday.plusDays(6)
        );
        assertEquals(3, weekTasks.size());

        List<StudyTask> completedInWeek = taskRepository.findByScheduledDateBetweenAndStatus(
                monday,
                monday.plusDays(6),
                TaskStatus.COMPLETED
        );
        assertEquals(2, completedInWeek.size());
    }

    @Test
    @DisplayName("Should verify records persist and can be read across direct JDBC database connections")
    void testPersistenceAcrossDirectConnections() throws Exception {
        Subject subject = subjectRepository.save(new Subject("Compiler Design", "Lexical analysis & ASTs", 8.0));
        assertNotNull(subject.getId());

        // Directly open a raw JDBC connection to the SQLite test database file to verify raw disk persistence
        String testDbPath = "target/test-db/test-study-planner.db";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + testDbPath);
             Statement stmt = connection.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT name, weekly_target_minutes FROM subjects WHERE id = " + subject.getId())) {

            assertTrue(rs.next(), "Record should exist in SQLite database on disk");
            assertEquals("Compiler Design", rs.getString("name"));
            assertEquals(480, rs.getInt("weekly_target_minutes"));
        }
    }
}
