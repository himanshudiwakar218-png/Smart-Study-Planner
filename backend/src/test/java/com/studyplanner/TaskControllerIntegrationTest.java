package com.studyplanner;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyplanner.dto.ScheduleValidateRequest;
import com.studyplanner.dto.SubjectRequest;
import com.studyplanner.dto.SubjectResponse;
import com.studyplanner.dto.TaskRequest;
import com.studyplanner.model.Priority;
import com.studyplanner.model.TaskStatus;
import com.studyplanner.repository.SubjectRepository;
import com.studyplanner.repository.TaskRepository;
import com.studyplanner.service.SubjectService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TaskControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SubjectService subjectService;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Long createdSubjectId;
    private final LocalDate testDate = LocalDate.now().plusDays(2);

    @BeforeEach
    void cleanUp() {
        taskRepository.deleteAll();
        subjectRepository.deleteAll();

        SubjectResponse subject = subjectService.createSubject(
                new SubjectRequest("Algorithms", "Sorting and Searching", 8.0)
        );
        createdSubjectId = subject.getId();
    }

    @Test
    @DisplayName("Create task and then adjacent task succeeds, while overlapping task returns 409 Conflict")
    void testTaskCreationAndScheduleOverlap() throws Exception {
        // 1. Create first task: 10:00 to 11:00 (duration 60 mins)
        TaskRequest task1 = new TaskRequest(
                "Merge Sort Implementation", "Write divide and conquer code",
                createdSubjectId, testDate, LocalTime.of(10, 0), 60,
                Priority.HIGH, TaskStatus.PENDING
        );

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(task1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title", is("Merge Sort Implementation")))
                .andExpect(jsonPath("$.startTime", is("10:00:00")))
                .andExpect(jsonPath("$.endTime", is("11:00:00")));

        // 2. Adjacent task: 11:00 to 12:00 (starts right when task1 ends) -> MUST SUCCEED (201 Created)
        TaskRequest adjacentTask = new TaskRequest(
                "Quick Sort Implementation", "Partition logic",
                createdSubjectId, testDate, LocalTime.of(11, 0), 60,
                Priority.MEDIUM, TaskStatus.PENDING
        );

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adjacentTask)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title", is("Quick Sort Implementation")));

        // 3. Overlapping task: 10:30 to 11:30 (intersects with task 1 and adjacent task) -> MUST FAIL (409 Conflict)
        TaskRequest conflictingTask = new TaskRequest(
                "Heap Sort", "Priority queues",
                createdSubjectId, testDate, LocalTime.of(10, 30), 60,
                Priority.LOW, TaskStatus.PENDING
        );

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(conflictingTask)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.message", containsString("conflict")));
    }

    @Test
    @DisplayName("Complete and reopen task via PATCH endpoints")
    void testCompleteAndReopenTask() throws Exception {
        TaskRequest task = new TaskRequest(
                "Binary Search", "Iterative search",
                createdSubjectId, testDate, LocalTime.of(14, 0), 45,
                Priority.MEDIUM, TaskStatus.PENDING
        );

        String responseString = mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(task)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long taskId = objectMapper.readTree(responseString).get("id").asLong();

        // Complete the task
        mockMvc.perform(patch("/api/tasks/" + taskId + "/complete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.completedAt").isNotEmpty());

        // Reopen the task
        mockMvc.perform(patch("/api/tasks/" + taskId + "/reopen"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("PENDING")))
                .andExpect(jsonPath("$.completedAt").isEmpty());
    }

    @Test
    @DisplayName("Dashboard summary reflects actual persisted records")
    void testDashboardSummary() throws Exception {
        TaskRequest task = new TaskRequest(
                "Graph Traversal", "BFS and DFS",
                createdSubjectId, testDate, LocalTime.of(15, 0), 60,
                Priority.HIGH, TaskStatus.PENDING
        );

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(task)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSubjects", is(1)))
                .andExpect(jsonPath("$.totalTasks", is(1)))
                .andExpect(jsonPath("$.pendingTasks", is(1)))
                .andExpect(jsonPath("$.totalScheduledMinutes", is(60)));
    }

    @Test
    @DisplayName("POST /api/schedule/validate checks for conflicts without persisting")
    void testScheduleValidateEndpoint() throws Exception {
        TaskRequest existing = new TaskRequest(
                "Existing Session", "Study",
                createdSubjectId, testDate, LocalTime.of(9, 0), 60,
                Priority.MEDIUM, TaskStatus.PENDING
        );

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(existing)))
                .andExpect(status().isCreated());

        // Validate a conflicting time
        ScheduleValidateRequest conflictRequest = new ScheduleValidateRequest(
                testDate, LocalTime.of(9, 30), 45, null
        );

        mockMvc.perform(post("/api/schedule/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(conflictRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid", is(false)))
                .andExpect(jsonPath("$.conflicts", hasSize(1)));

        // Validate a free time slot
        ScheduleValidateRequest freeRequest = new ScheduleValidateRequest(
                testDate, LocalTime.of(16, 0), 60, null
        );

        mockMvc.perform(post("/api/schedule/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(freeRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid", is(true)))
                .andExpect(jsonPath("$.conflicts", hasSize(0)));
    }
}
