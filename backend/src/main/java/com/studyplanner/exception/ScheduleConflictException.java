package com.studyplanner.exception;

/**
 * Exception thrown when a study task schedule conflicts/overlaps with an existing session.
 */
public class ScheduleConflictException extends RuntimeException {

    public ScheduleConflictException(String message) {
        super(message);
    }
}
