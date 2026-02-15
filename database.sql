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
-- TABLE: VEHICLES
-- ============================================================================
CREATE TABLE vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    vehicle_type ENUM('economy','premium','suv','van','luxury') DEFAULT 'economy',
    capacity INT NOT NULL,
    price_per_km DECIMAL(10,2) NOT NULL,
    description TEXT,
    registration_number VARCHAR(50) UNIQUE,
    is_available BOOLEAN DEFAULT TRUE,
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
-- INSERT DEMO DATA
-- ============================================================================

-- Insert Demo Users
INSERT INTO users (name, email, phone, password_hash, role, is_active) VALUES
('John Doe', 'user@example.com', '+91-9876543210', 'user123', 'user', TRUE),
('Admin User', 'admin@example.com', '+91-9876543211', 'admin123', 'admin', TRUE),
('Sarah Wilson', 'sarah@example.com', '+91-9876543212', 'Sarah@123', 'user', TRUE),
('Mike Johnson', 'mike@example.com', '+91-9876543213', 'Mike@123', 'user', TRUE);

-- Insert Demo Vehicles
INSERT INTO vehicles (name, vehicle_type, capacity, price_per_km, description, registration_number, is_available) VALUES
('Toyota Prius', 'economy', 4, 12.00, 'Economical and fuel-efficient vehicle for budget-friendly rides', 'MH-01-AB-1001', TRUE),
('BMW 3 Series', 'premium', 4, 28.00, 'Luxury sedan with premium features and comfortable interiors', 'MH-01-AB-1002', TRUE),
('Toyota 4Runner', 'suv', 7, 20.00, 'Spacious SUV perfect for group travel and family trips', 'MH-01-AB-1003', TRUE),
('Mercedes Van', 'van', 8, 24.00, 'Large van for group transport with ample luggage space', 'MH-01-AB-1004', TRUE),
('Audi A6', 'luxury', 4, 35.00, 'Premium luxury sedan with top-tier amenities', 'MH-01-AB-1005', TRUE),
('Honda City', 'economy', 4, 10.00, 'Reliable and comfortable compact sedan', 'MH-01-AB-1006', TRUE);

-- Insert Demo Drivers
INSERT INTO drivers (name, phone, license_number, is_available, rating) VALUES
('Rajesh Kumar', '+91-9988776655', 'MH-123456789', TRUE, 4.8),
('Amit Sharma', '+91-9988776656', 'MH-123456790', TRUE, 4.7),
('Vikram Singh', '+91-9988776657', 'DL-123456791', TRUE, 4.9),
('Priya Patel', '+91-9988776658', 'KA-123456792', TRUE, 4.6);

-- Insert Demo Bookings
INSERT INTO bookings (user_id, driver_id, pickup_location, dropoff_location, booking_date, passengers, status, fare) VALUES
(1, 1, 'Mumbai Airport', 'Taj Mahal Palace', '2026-02-15 10:00:00', 2, 'confirmed', 300.00),
(3, 2, 'Connaught Place', 'India Gate', '2026-02-15 14:30:00', 3, 'pending', 250.00),
(4, 3, 'Bangalore City Center', 'Airport', '2026-02-16 06:00:00', 5, 'confirmed', 840.00),
(1, 1, 'Gateway of India', 'Bandra', '2026-02-10 09:00:00', 2, 'completed', 150.00),
(3, 4, 'Delhi Railway Station', 'Qutub Minar', '2026-02-12 11:00:00', 6, 'completed', 432.00);

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
