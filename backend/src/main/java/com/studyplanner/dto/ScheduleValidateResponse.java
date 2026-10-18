package com.studyplanner.dto;

import java.util.List;

/**
 * Response DTO indicating whether a proposed session has conflicts.
 */
public class ScheduleValidateResponse {

    private boolean valid;
    private String message;
    private List<TaskResponse> conflicts;

    public ScheduleValidateResponse() {
    }

    public ScheduleValidateResponse(boolean valid, String message, List<TaskResponse> conflicts) {
        this.valid = valid;
        this.message = message;
        this.conflicts = conflicts;
    }

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<TaskResponse> getConflicts() {
        return conflicts;
    }

    public void setConflicts(List<TaskResponse> conflicts) {
        this.conflicts = conflicts;
    }
}
