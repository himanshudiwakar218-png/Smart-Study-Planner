package com.studyplanner.exception;

/**
 * Exception thrown when a requested resource (Subject or Task) is not found.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
