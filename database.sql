-- ============================================================================
-- SNR TRAVELS - MINIMAL DATABASE SCHEMA
-- Tables: users, drivers, bookings
-- Dashboard: stored procedure
-- MySQL 8.0+
-- ============================================================================

/* ================= DATABASE ================= */
DROP DATABASE IF EXISTS transport_db;
CREATE DATABASE transport_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE transport_db;

-- ============================================================================
-- TABLE: USERS
-- ============================================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user','admin') DEFAULT 'user',

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: DRIVERS
-- ============================================================================
CREATE TABLE drivers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,

    is_available BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3,2) DEFAULT 5.0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- TABLE: BOOKINGS
-- ============================================================================
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,
    driver_id INT,

    pickup_location VARCHAR(255) NOT NULL,
    dropoff_location VARCHAR(255) NOT NULL,
    booking_date DATETIME NOT NULL,
    passengers INT NOT NULL,

    status ENUM('pending','confirmed','completed','cancelled')
        DEFAULT 'pending',

    fare DECIMAL(10,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- DASHBOARD STORED PROCEDURE
-- ============================================================================
DELIMITER //
CREATE PROCEDURE sp_dashboard_stats()
BEGIN
    SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM drivers) AS total_drivers,
        (SELECT COUNT(*) FROM bookings) AS total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status='pending') AS pending_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status='completed') AS completed_bookings,
        (SELECT COALESCE(SUM(fare),0) FROM bookings WHERE status='completed') AS total_revenue;
END //
DELIMITER ;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 'SNR Travels Minimal Database Created Successfully!' AS Status;
