package com.studyplanner.exception;

/**
 * Exception thrown when a request fails validation or business constraints (e.g. attempting
 * to delete a subject that still has associated tasks, or invalid date range).
 */
public class InvalidRequestException extends RuntimeException {

    public InvalidRequestException(String message) {
        super(message);
    }
}
