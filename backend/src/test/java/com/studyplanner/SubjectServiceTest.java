package com.studyplanner;

import com.studyplanner.dto.SubjectRequest;
import com.studyplanner.dto.SubjectResponse;
import com.studyplanner.exception.DuplicateResourceException;
import com.studyplanner.exception.InvalidRequestException;
import com.studyplanner.exception.ResourceNotFoundException;
import com.studyplanner.model.Subject;
import com.studyplanner.repository.SubjectRepository;
import com.studyplanner.repository.TaskRepository;
import com.studyplanner.service.SubjectService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubjectServiceTest {

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private SubjectService subjectService;

    private Subject javaSubject;

    @BeforeEach
    void setUp() {
        javaSubject = new Subject(1L, "Java Programming", "Core Java and OOP", 8.0);
    }

    @Test
    @DisplayName("Create subject successfully")
    void testCreateSubjectSuccess() {
        SubjectRequest request = new SubjectRequest("Java Programming", "Core Java and OOP", 8.0);

        when(subjectRepository.existsByNameIgnoreCase("Java Programming")).thenReturn(false);
        when(subjectRepository.save(any(Subject.class))).thenReturn(javaSubject);

        SubjectResponse response = subjectService.createSubject(request);

        assertNotNull(response);
        assertEquals("Java Programming", response.getName());
        assertEquals(8.0, response.getTargetWeeklyHours());
        verify(subjectRepository, times(1)).save(any(Subject.class));
    }

    @Test
    @DisplayName("Create subject with duplicate name throws DuplicateResourceException")
    void testCreateDuplicateSubjectThrows() {
        SubjectRequest request = new SubjectRequest("Java Programming", "Duplicate name", 5.0);

        when(subjectRepository.existsByNameIgnoreCase("Java Programming")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> subjectService.createSubject(request));
        verify(subjectRepository, never()).save(any(Subject.class));
    }

    @Test
    @DisplayName("Get subject by ID returns subject response")
    void testGetSubjectByIdSuccess() {
        when(subjectRepository.findById(1L)).thenReturn(Optional.of(javaSubject));

        SubjectResponse response = subjectService.getSubjectById(1L);

        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals("Java Programming", response.getName());
    }

    @Test
    @DisplayName("Get subject by non-existent ID throws ResourceNotFoundException")
    void testGetSubjectByInvalidIdThrows() {
        when(subjectRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> subjectService.getSubjectById(999L));
    }

    @Test
    @DisplayName("Delete subject with no associated tasks succeeds")
    void testDeleteSubjectSafe() {
        when(subjectRepository.findById(1L)).thenReturn(Optional.of(javaSubject));
        when(taskRepository.countBySubjectId(1L)).thenReturn(0L);

        assertDoesNotThrow(() -> subjectService.deleteSubject(1L));
        verify(subjectRepository, times(1)).deleteById(1L);
    }

    @Test
    @DisplayName("Delete subject with existing associated tasks throws InvalidRequestException to prevent orphans")
    void testDeleteSubjectWithExistingTasksThrows() {
        when(subjectRepository.findById(1L)).thenReturn(Optional.of(javaSubject));
        when(taskRepository.countBySubjectId(1L)).thenReturn(3L);

        InvalidRequestException ex = assertThrows(InvalidRequestException.class, () -> subjectService.deleteSubject(1L));
        assertTrue(ex.getMessage().contains("associated with it"));
        verify(subjectRepository, never()).deleteById(anyLong());
    }
}
