package com.studyplanner.repository;

import com.studyplanner.model.Priority;
import com.studyplanner.model.StudyTask;
import com.studyplanner.model.TaskStatus;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<StudyTask, Long> {

    List<StudyTask> findByScheduledDateOrderByStartTimeAsc(LocalDate date);

    List<StudyTask> findByScheduledDate(LocalDate date);

    List<StudyTask> findByScheduledDateBetweenOrderByScheduledDateAscStartTimeAsc(LocalDate startDate, LocalDate endDate);

    List<StudyTask> findByScheduledDateBetweenAndStatus(LocalDate startDate, LocalDate endDate, TaskStatus status);

    List<StudyTask> findBySubjectId(Long subjectId);

    List<StudyTask> findBySubjectIdOrderByScheduledDateAscStartTimeAsc(Long subjectId);

    long countBySubjectId(Long subjectId);

    long countBySubjectIdAndStatus(Long subjectId, TaskStatus status);

    boolean existsBySubjectId(Long subjectId);

    List<StudyTask> findByStatus(TaskStatus status);

    List<StudyTask> findByPriority(Priority priority);

    List<StudyTask> findByStatusAndPriority(TaskStatus status, Priority priority);

    @Query("SELECT t FROM StudyTask t WHERE " +
           "t.status != com.studyplanner.model.TaskStatus.COMPLETED AND " +
           "(t.scheduledDate < :date OR (t.scheduledDate = :date AND t.startTime < :time)) " +
           "ORDER BY t.scheduledDate ASC, t.startTime ASC")
    List<StudyTask> findOverdueTasks(@Param("date") LocalDate date, @Param("time") LocalTime time);

    @Query("SELECT COUNT(t) FROM StudyTask t WHERE " +
           "t.status != com.studyplanner.model.TaskStatus.COMPLETED AND " +
           "(t.scheduledDate < :date OR (t.scheduledDate = :date AND t.startTime < :time))")
    long countOverdueTasks(@Param("date") LocalDate date, @Param("time") LocalTime time);

    @Query("SELECT t FROM StudyTask t WHERE " +
           "(:subjectId IS NULL OR t.subject.id = :subjectId) AND " +
           "(:date IS NULL OR t.scheduledDate = :date) AND " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:priority IS NULL OR t.priority = :priority)")
    List<StudyTask> findFilteredTasks(
            @Param("subjectId") Long subjectId,
            @Param("date") LocalDate date,
            @Param("status") TaskStatus status,
            @Param("priority") Priority priority,
            Sort sort
    );
}
