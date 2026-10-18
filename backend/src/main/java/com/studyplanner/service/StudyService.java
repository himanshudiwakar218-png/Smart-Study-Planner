package com.studyplanner.service;

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
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service managing study tasks including creation, updates, completion, filtering,
 * and overdue task identification.
 */
@Service
@Transactional
public class StudyService {

    private final TaskRepository taskRepository;
    private final SubjectRepository subjectRepository;
    private final ScheduleService scheduleService;

    public StudyService(TaskRepository taskRepository, SubjectRepository subjectRepository, ScheduleService scheduleService) {
        this.taskRepository = taskRepository;
        this.subjectRepository = subjectRepository;
        this.scheduleService = scheduleService;
    }

    /**
     * Creates a new study task after verifying subject exists and validating schedule conflicts.
     */
    public TaskResponse createTask(TaskRequest request) {
        if (request.getDurationMinutes() == null || request.getDurationMinutes() <= 0) {
            throw new InvalidRequestException("Task duration must be greater than zero minutes");
        }

        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + request.getSubjectId()));

        // Validate that this session does not overlap with an existing session on the same date
        scheduleService.validateNoConflict(
                request.getScheduledDate(),
                request.getStartTime(),
                request.getDurationMinutes(),
                null
        );

        StudyTask task = new StudyTask(
                request.getTitle().trim(),
                request.getDescription(),
                subject,
                request.getScheduledDate(),
                request.getStartTime(),
                request.getDurationMinutes(),
                request.getPriority() != null ? request.getPriority() : Priority.MEDIUM,
                request.getStatus() != null ? request.getStatus() : TaskStatus.PENDING
        );

        StudyTask saved = taskRepository.save(task);
        return TaskResponse.fromEntity(saved);
    }

    /**
     * Retrieves a task by its ID.
     */
    @Transactional(readOnly = true)
    public TaskResponse getTaskById(Long id) {
        StudyTask task = findTaskOrThrow(id);
        return TaskResponse.fromEntity(task);
    }

    /**
     * Retrieves tasks with optional filtering and sorting.
     */
    @Transactional(readOnly = true)
    public List<TaskResponse> getAllTasks(Long subjectId, LocalDate date, TaskStatus status,
                                          Priority priority, String sortBy, String sortDirection) {
        Sort sort = determineSort(sortBy, sortDirection);

        List<StudyTask> tasks = taskRepository.findFilteredTasks(subjectId, date, status, priority, sort);

        // In-memory secondary sort if needed (e.g. for Priority enum custom order if requested)
        if ("priority".equalsIgnoreCase(sortBy)) {
            Comparator<StudyTask> priorityComparator = Comparator.comparing(
                    t -> t.getPriority() == Priority.HIGH ? 3 : (t.getPriority() == Priority.MEDIUM ? 2 : 1)
            );
            if ("desc".equalsIgnoreCase(sortDirection)) {
                priorityComparator = priorityComparator.reversed();
            }
            tasks = tasks.stream().sorted(priorityComparator).collect(Collectors.toList());
        }

        return tasks.stream()
                .map(TaskResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves tasks scheduled for today.
     */
    @Transactional(readOnly = true)
    public List<TaskResponse> getTodayTasks() {
        LocalDate today = LocalDate.now();
        return taskRepository.findByScheduledDateOrderByStartTimeAsc(today)
                .stream()
                .map(TaskResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves tasks that are pending.
     */
    @Transactional(readOnly = true)
    public List<TaskResponse> getPendingTasks() {
        return taskRepository.findByStatus(TaskStatus.PENDING)
                .stream()
                .sorted(Comparator.comparing(StudyTask::getScheduledDate).thenComparing(StudyTask::getStartTime))
                .map(TaskResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves tasks that are overdue.
     * A task is overdue if not completed and its scheduled time has passed.
     */
    @Transactional(readOnly = true)
    public List<TaskResponse> getOverdueTasks() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        return taskRepository.findAll().stream()
                .filter(t -> t.getStatus() != TaskStatus.COMPLETED)
                .filter(t -> isTaskOverdue(t, today, now))
                .sorted(Comparator.comparing(StudyTask::getScheduledDate).thenComparing(StudyTask::getStartTime))
                .map(TaskResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Updates an existing task, excluding itself from the overlap check.
     */
    public TaskResponse updateTask(Long id, TaskRequest request) {
        StudyTask task = findTaskOrThrow(id);

        if (request.getDurationMinutes() == null || request.getDurationMinutes() <= 0) {
            throw new InvalidRequestException("Task duration must be greater than zero minutes");
        }

        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + request.getSubjectId()));

        // Validate schedule conflict, excluding this task ID
        scheduleService.validateNoConflict(
                request.getScheduledDate(),
                request.getStartTime(),
                request.getDurationMinutes(),
                id
        );

        task.setTitle(request.getTitle().trim());
        task.setDescription(request.getDescription());
        task.setSubject(subject);
        task.setScheduledDate(request.getScheduledDate());
        task.setStartTime(request.getStartTime());
        task.setDurationMinutes(request.getDurationMinutes());
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }

        // Status update logic
        if (request.getStatus() != null) {
            if (request.getStatus() == TaskStatus.COMPLETED && task.getStatus() != TaskStatus.COMPLETED) {
                task.setCompletedAt(LocalDateTime.now());
            } else if (request.getStatus() != TaskStatus.COMPLETED && task.getStatus() == TaskStatus.COMPLETED) {
                task.setCompletedAt(null);
            }
            task.setStatus(request.getStatus());
        }

        StudyTask updated = taskRepository.save(task);
        return TaskResponse.fromEntity(updated);
    }

    /**
     * Deletes a study task.
     */
    public void deleteTask(Long id) {
        StudyTask task = findTaskOrThrow(id);
        taskRepository.delete(task);
    }

    /**
     * Marks a task as COMPLETED and sets the completion timestamp.
     */
    public TaskResponse completeTask(Long id) {
        StudyTask task = findTaskOrThrow(id);
        task.setStatus(TaskStatus.COMPLETED);
        task.setCompletedAt(LocalDateTime.now());
        StudyTask saved = taskRepository.save(task);
        return TaskResponse.fromEntity(saved);
    }

    /**
     * Reopens a completed task, changing status to PENDING and resetting completion timestamp.
     */
    public TaskResponse reopenTask(Long id) {
        StudyTask task = findTaskOrThrow(id);
        task.setStatus(TaskStatus.PENDING);
        task.setCompletedAt(null);
        StudyTask saved = taskRepository.save(task);
        return TaskResponse.fromEntity(saved);
    }

    /**
     * Determines whether a given task is overdue.
     */
    public boolean isTaskOverdue(StudyTask task, LocalDate today, LocalTime currentTime) {
        if (task.getStatus() == TaskStatus.COMPLETED) {
            return false;
        }

        LocalDate scheduledDate = task.getScheduledDate();
        if (scheduledDate == null) {
            return false;
        }

        if (scheduledDate.isBefore(today)) {
            return true;
        }

        if (scheduledDate.isEqual(today)) {
            LocalTime endTime = task.getEndTime();
            return endTime != null && endTime.isBefore(currentTime);
        }

        return false;
    }

    /**
     * Helper to find entity or throw 404.
     */
    @Transactional(readOnly = true)
    public StudyTask findTaskOrThrow(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));
    }

    private Sort determineSort(String sortBy, String sortDirection) {
        Sort.Direction direction = "desc".equalsIgnoreCase(sortDirection) ? Sort.Direction.DESC : Sort.Direction.ASC;

        if ("date".equalsIgnoreCase(sortBy)) {
            return Sort.by(direction, "scheduledDate").and(Sort.by(direction, "startTime"));
        } else if ("startTime".equalsIgnoreCase(sortBy)) {
            return Sort.by(direction, "startTime");
        } else if ("title".equalsIgnoreCase(sortBy)) {
            return Sort.by(direction, "title");
        } else if ("status".equalsIgnoreCase(sortBy)) {
            return Sort.by(direction, "status");
        }

        // Default sort by scheduledDate ASC, then startTime ASC
        return Sort.by(Sort.Direction.ASC, "scheduledDate", "startTime");
    }
}
