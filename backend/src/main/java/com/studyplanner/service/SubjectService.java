package com.studyplanner.service;

import com.studyplanner.dto.SubjectRequest;
import com.studyplanner.dto.SubjectResponse;
import com.studyplanner.exception.DuplicateResourceException;
import com.studyplanner.exception.InvalidRequestException;
import com.studyplanner.exception.ResourceNotFoundException;
import com.studyplanner.model.Subject;
import com.studyplanner.repository.SubjectRepository;
import com.studyplanner.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service managing subject creation, retrieval, updates, and safe deletion.
 */
@Service
@Transactional
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final TaskRepository taskRepository;

    public SubjectService(SubjectRepository subjectRepository, TaskRepository taskRepository) {
        this.subjectRepository = subjectRepository;
        this.taskRepository = taskRepository;
    }

    /**
     * Creates a new study subject.
     * Prevents duplicate subject names.
     */
    public SubjectResponse createSubject(SubjectRequest request) {
        String trimmedName = request.getName().trim();
        if (subjectRepository.existsByNameIgnoreCase(trimmedName)) {
            throw new DuplicateResourceException("Subject with name '" + trimmedName + "' already exists");
        }

        Subject subject = new Subject(
                trimmedName,
                request.getDescription(),
                request.getTargetWeeklyHours()
        );

        Subject saved = subjectRepository.save(subject);
        return SubjectResponse.fromEntity(saved);
    }

    /**
     * Retrieves all subjects.
     */
    @Transactional(readOnly = true)
    public List<SubjectResponse> getAllSubjects() {
        return subjectRepository.findAll()
                .stream()
                .map(SubjectResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a subject by its unique ID.
     */
    @Transactional(readOnly = true)
    public SubjectResponse getSubjectById(Long id) {
        Subject subject = findSubjectOrThrow(id);
        return SubjectResponse.fromEntity(subject);
    }

    /**
     * Updates an existing subject.
     */
    public SubjectResponse updateSubject(Long id, SubjectRequest request) {
        Subject subject = findSubjectOrThrow(id);

        String trimmedName = request.getName().trim();
        if (subjectRepository.existsByNameIgnoreCaseAndIdNot(trimmedName, id)) {
            throw new DuplicateResourceException("Subject with name '" + trimmedName + "' already exists");
        }

        subject.setName(trimmedName);
        subject.setDescription(request.getDescription());
        subject.setTargetWeeklyHours(request.getTargetWeeklyHours());

        Subject updated = subjectRepository.save(subject);
        return SubjectResponse.fromEntity(updated);
    }

    /**
     * Deletes a subject only when safe to do so.
     * Prevents orphaned tasks by verifying no tasks are linked to this subject.
     */
    public void deleteSubject(Long id) {
        findSubjectOrThrow(id);

        long taskCount = taskRepository.countBySubjectId(id);
        if (taskCount > 0) {
            throw new InvalidRequestException(
                    "Cannot delete subject with ID " + id + " because " + taskCount +
                    " task(s) are still associated with it. Please reassign or delete these tasks first."
            );
        }

        subjectRepository.deleteById(id);
    }

    /**
     * Helper to find entity or throw 404.
     */
    @Transactional(readOnly = true)
    public Subject findSubjectOrThrow(Long id) {
        return subjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + id));
    }
}
