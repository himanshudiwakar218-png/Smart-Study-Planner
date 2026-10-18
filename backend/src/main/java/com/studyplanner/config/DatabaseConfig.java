package com.studyplanner.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Properties;

/**
 * Configuration for SQLite database connection, ensuring database directory exists,
 * configuring proper path resolution across root/backend CWD, and enforcing foreign keys.
 */
@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Value("${spring.datasource.url:jdbc:sqlite:data/study-planner.db}")
    private String datasourceUrl;

    @Bean
    @Primary
    public DataSource dataSource() {
        String resolvedUrl = resolveDatasourceUrl(datasourceUrl);
        ensureDatabaseDirectory(resolvedUrl);

        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.sqlite.JDBC");
        dataSource.setUrl(resolvedUrl);

        // Enable SQLite foreign key constraint enforcement on all connections
        Properties connectionProperties = new Properties();
        connectionProperties.setProperty("foreign_keys", "on");
        dataSource.setConnectionProperties(connectionProperties);

        log.info("Initialized SQLite DataSource at: {}", resolvedUrl);
        return dataSource;
    }

    /**
     * Resolves SQLite URL so that running from backend/ or project root consistently
     * targets data/study-planner.db at the project root level.
     */
    private String resolveDatasourceUrl(String url) {
        if (url == null || !url.startsWith("jdbc:sqlite:")) {
            return url;
        }

        String dbPath = url.substring("jdbc:sqlite:".length()).trim();
        if (":memory:".equals(dbPath) || dbPath.isEmpty()) {
            return url;
        }

        // If default relative path 'data/study-planner.db' and CWD is 'backend', resolve to '../data/study-planner.db'
        Path currentDir = Paths.get("").toAbsolutePath();
        if ("data/study-planner.db".equals(dbPath) && currentDir.getFileName() != null
                && "backend".equalsIgnoreCase(currentDir.getFileName().toString())) {
            Path rootDataDir = currentDir.getParent().resolve("data");
            return "jdbc:sqlite:" + rootDataDir.resolve("study-planner.db").toString();
        }

        return url;
    }

    private void ensureDatabaseDirectory(String url) {
        if (url != null && url.startsWith("jdbc:sqlite:")) {
            String dbPath = url.substring("jdbc:sqlite:".length()).trim();
            if (!dbPath.isEmpty() && !":memory:".equals(dbPath)) {
                int questionMarkIndex = dbPath.indexOf('?');
                if (questionMarkIndex != -1) {
                    dbPath = dbPath.substring(0, questionMarkIndex);
                }

                try {
                    Path path = Paths.get(dbPath);
                    Path parentDir = path.getParent();
                    if (parentDir != null && !Files.exists(parentDir)) {
                        Files.createDirectories(parentDir);
                        log.info("Created SQLite database directory: {}", parentDir.toAbsolutePath());
                    }
                } catch (IOException e) {
                    log.error("Failed to create directory for SQLite database at {}", dbPath, e);
                    throw new IllegalStateException("Failed to create database directory for path: " + dbPath, e);
                }
            }
        }
    }
}
