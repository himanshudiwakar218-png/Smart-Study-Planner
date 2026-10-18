package com.studyplanner.exception;

/**
 * Exception thrown when attempting to create or update a resource with duplicate unique fields.
 */
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}
