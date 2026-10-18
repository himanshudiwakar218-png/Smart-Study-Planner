package com.studyplanner.controller;

import com.studyplanner.dto.DayScheduleResponse;
import com.studyplanner.dto.ScheduleValidateRequest;
import com.studyplanner.dto.ScheduleValidateResponse;
import com.studyplanner.dto.WeekScheduleResponse;
import com.studyplanner.service.ScheduleService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * REST Controller for scheduling logic and conflict validation under /api/schedule.
 */
@RestController
@RequestMapping("/api/schedule")
public class ScheduleController {

    private final ScheduleService scheduleService;

    public ScheduleController(ScheduleService scheduleService) {
        this.scheduleService = scheduleService;
    }

    @GetMapping("/day")
    public ResponseEntity<DayScheduleResponse> getDaySchedule(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        DayScheduleResponse daySchedule = scheduleService.getDaySchedule(date);
        return ResponseEntity.ok(daySchedule);
    }

    @GetMapping("/week")
    public ResponseEntity<WeekScheduleResponse> getWeekSchedule(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate) {
        WeekScheduleResponse weekSchedule = scheduleService.getWeekSchedule(startDate);
        return ResponseEntity.ok(weekSchedule);
    }

    @PostMapping("/validate")
    public ResponseEntity<ScheduleValidateResponse> validateSchedule(
            @Valid @RequestBody ScheduleValidateRequest request) {
        ScheduleValidateResponse response = scheduleService.validateSchedule(request);
        return ResponseEntity.ok(response);
    }
}
