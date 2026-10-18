package com.studyplanner;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyplanner.dto.SubjectRequest;
import com.studyplanner.repository.SubjectRepository;
import com.studyplanner.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SubjectControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void cleanUp() {
        taskRepository.deleteAll();
        subjectRepository.deleteAll();
    }

    @Test
    @DisplayName("POST /api/subjects creates a subject and persists to SQLite database")
    void testCreateSubject() throws Exception {
        SubjectRequest request = new SubjectRequest("Operating Systems", "Process management and memory", 6.5);

        mockMvc.perform(post("/api/subjects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name", is("Operating Systems")))
                .andExpect(jsonPath("$.targetWeeklyHours", is(6.5)));
    }

    @Test
    @DisplayName("POST /api/subjects returns 409 Conflict when subject name already exists")
    void testDuplicateSubjectReturnsConflict() throws Exception {
        SubjectRequest request1 = new SubjectRequest("Computer Networks", "OSI model and TCP/IP", 5.0);
        mockMvc.perform(post("/api/subjects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request1)))
                .andExpect(status().isCreated());

        SubjectRequest duplicateRequest = new SubjectRequest("Computer Networks", "Duplicate name", 4.0);
        mockMvc.perform(post("/api/subjects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("POST /api/subjects returns 400 Bad Request when subject name is blank")
    void testBlankSubjectNameReturnsBadRequest() throws Exception {
        SubjectRequest invalidRequest = new SubjectRequest("", "No name provided", 5.0);

        mockMvc.perform(post("/api/subjects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.validationErrors.name").exists());
    }
}
