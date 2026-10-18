package com.studyplanner.controller;

import com.studyplanner.dto.DailySummaryResponse;
import com.studyplanner.dto.DashboardSummaryResponse;
import com.studyplanner.dto.SubjectProgressResponse;
import com.studyplanner.dto.WeeklySummaryResponse;
import com.studyplanner.service.DashboardService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * REST Controller for dashboard metrics and progress reporting under /api/dashboard.
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryResponse> getSummary() {
        DashboardSummaryResponse summary = dashboardService.getSummary();
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/subjects")
    public ResponseEntity<List<SubjectProgressResponse>> getSubjectProgress() {
        List<SubjectProgressResponse> progress = dashboardService.getSubjectProgress();
        return ResponseEntity.ok(progress);
    }

    @GetMapping("/daily")
    public ResponseEntity<DailySummaryResponse> getDailySummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        DailySummaryResponse daily = dashboardService.getDailySummary(date);
        return ResponseEntity.ok(daily);
    }

    @GetMapping("/weekly")
    public ResponseEntity<WeeklySummaryResponse> getWeeklySummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate) {
        WeeklySummaryResponse weekly = dashboardService.getWeeklySummary(startDate);
        return ResponseEntity.ok(weekly);
    }
}
