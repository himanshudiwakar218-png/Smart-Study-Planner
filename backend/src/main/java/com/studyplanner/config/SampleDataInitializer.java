package com.studyplanner.config;

import com.studyplanner.model.Priority;
import com.studyplanner.model.StudyTask;
import com.studyplanner.model.Subject;
import com.studyplanner.model.TaskStatus;
import com.studyplanner.repository.SubjectRepository;
import com.studyplanner.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Optional development data initializer.
 * Enabled only when app.sample-data.enabled=true in configuration.
 * Disabled by default. Will never overwrite existing user data.
 */
@Component
@ConditionalOnProperty(name = "app.sample-data.enabled", havingValue = "true", matchIfMissing = false)
public class SampleDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SampleDataInitializer.class);

    private final SubjectRepository subjectRepository;
    private final TaskRepository taskRepository;

    public SampleDataInitializer(SubjectRepository subjectRepository, TaskRepository taskRepository) {
        this.subjectRepository = subjectRepository;
        this.taskRepository = taskRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (subjectRepository.count() > 0) {
            log.info("Existing database records detected ({} subjects). Skipping sample data initialization.",
                    subjectRepository.count());
            return;
        }

        log.info("Sample data initialization is enabled and database is empty. Seeding initial study records...");

        // 1. Seed Sample Subjects
        Subject java = new Subject(
                "Java Programming",
                "Core OOP, Collections, Concurrency, and Spring Boot framework",
                8.0
        );

        Subject dsa = new Subject(
                "Data Structures and Algorithms",
                "Arrays, Trees, Graphs, Sorting algorithms, and Dynamic Programming",
                10.0
        );

        Subject ml = new Subject(
                "Introduction to Machine Learning",
                "Supervised learning, neural networks, model evaluation, and scikit-learn",
                6.0
        );

        java = subjectRepository.save(java);
        dsa = subjectRepository.save(dsa);
        ml = subjectRepository.save(ml);

        LocalDate today = LocalDate.now();

        // 2. Seed Sample Study Tasks with varying statuses, priorities, and dates
        // Completed practice session
        StudyTask completedTask = new StudyTask(
                "Spring Boot REST Controller Practice",
                "Build CRUD endpoints with validation and error handling",
                java,
                today,
                LocalTime.of(9, 0),
                90,
                Priority.HIGH,
                TaskStatus.COMPLETED
        );
        completedTask.setCompletedAt(LocalDateTime.now().minusHours(2));

        // In-progress assignment
        StudyTask inProgressTask = new StudyTask(
                "Linear Regression Model Lab",
                "Implement gradient descent and evaluate MSE loss on housing dataset",
                ml,
                today,
                LocalTime.of(14, 0),
                75,
                Priority.MEDIUM,
                TaskStatus.IN_PROGRESS
        );

        // Pending revision
        StudyTask pendingRevision = new StudyTask(
                "Binary Search Trees & Traversals Revision",
                "Inorder, preorder, and postorder traversal problem sets",
                dsa,
                today.plusDays(1),
                LocalTime.of(11, 0),
                60,
                Priority.HIGH,
                TaskStatus.PENDING
        );

        // Low priority reading task
        StudyTask lowPriorityTask = new StudyTask(
                "Read Chapter 3: Clean Architecture Overview",
                "Read textbook pages 45-72 on system boundaries and layers",
                java,
                today.plusDays(2),
                LocalTime.of(16, 0),
                45,
                Priority.LOW,
                TaskStatus.PENDING
        );

        taskRepository.save(completedTask);
        taskRepository.save(inProgressTask);
        taskRepository.save(pendingRevision);
        taskRepository.save(lowPriorityTask);

        log.info("Sample data initialization completed successfully (3 subjects, 4 tasks).");
    }
}
