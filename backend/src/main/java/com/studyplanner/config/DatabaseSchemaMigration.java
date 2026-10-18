package com.studyplanner.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Non-destructive schema migration runner for SQLite.
 * Verifies and applies safe schema extensions (e.g. adding new columns to existing tables)
 * without deleting or modifying existing user records.
 */
@Component
@Order(1) // Run before SampleDataInitializer
public class DatabaseSchemaMigration implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSchemaMigration.class);

    private final DataSource dataSource;

    public DatabaseSchemaMigration(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {

            // Enforce foreign key constraints in SQLite
            stmt.execute("PRAGMA foreign_keys = ON;");

            // Check existing columns of 'subjects' table if it exists
            boolean hasWeeklyTargetMinutes = false;
            boolean hasUpdatedAt = false;
            boolean tableExists = false;

            try (ResultSet rs = stmt.executeQuery("PRAGMA table_info(subjects)")) {
                while (rs.next()) {
                    tableExists = true;
                    String colName = rs.getString("name");
                    if ("weekly_target_minutes".equalsIgnoreCase(colName)) {
                        hasWeeklyTargetMinutes = true;
                    } else if ("updated_at".equalsIgnoreCase(colName)) {
                        hasUpdatedAt = true;
                    }
                }
            }

            if (tableExists) {
                if (!hasWeeklyTargetMinutes) {
                    log.info("Applying non-destructive migration: Adding weekly_target_minutes to subjects");
                    stmt.execute("ALTER TABLE subjects ADD COLUMN weekly_target_minutes INTEGER DEFAULT 0;");
                }
                if (!hasUpdatedAt) {
                    log.info("Applying non-destructive migration: Adding updated_at to subjects");
                    stmt.execute("ALTER TABLE subjects ADD COLUMN updated_at TIMESTAMP;");
                }

                // Populate weekly_target_minutes from target_weekly_hours for existing records if null or 0
                stmt.execute("UPDATE subjects SET weekly_target_minutes = CAST(ROUND(target_weekly_hours * 60) AS INTEGER) " +
                             "WHERE (weekly_target_minutes IS NULL OR weekly_target_minutes = 0) AND target_weekly_hours > 0;");

                // Populate updated_at from created_at if null
                stmt.execute("UPDATE subjects SET updated_at = created_at WHERE updated_at IS NULL;");
            }

            log.info("SQLite schema verification and non-destructive migration completed successfully.");

        } catch (Exception e) {
            log.warn("Database schema migration notice: {}", e.getMessage());
        }
    }
}
