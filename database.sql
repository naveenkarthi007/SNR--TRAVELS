-- TransportHub Database Schema - REVISED & IMPROVED
-- Updated: February 14, 2026
-- Currency: Indian Rupees (₹)

-- Create Database
CREATE DATABASE IF NOT EXISTS transport_db;
USE transport_db;

-- ============================================================================
-- USERS TABLE - Stores all users (both regular users and admins)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pin_code VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
);

-- ============================================================================
-- VEHICLES TABLE - Stores all available vehicles
-- ============================================================================
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    capacity INT NOT NULL,
    price_per_km DECIMAL(10, 2) NOT NULL,
    description TEXT,
    registration_number VARCHAR(50) UNIQUE,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vehicle_type (vehicle_type),
    INDEX idx_availability (is_available)
);

-- ============================================================================
-- BOOKINGS TABLE - IMPROVED with proper relationships
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_id INT,
    pickup_location VARCHAR(255) NOT NULL,
    dropoff_location VARCHAR(255) NOT NULL,
    booking_date DATETIME NOT NULL,
    passengers INT NOT NULL,
    vehicle_type VARCHAR(50),
    estimated_distance DECIMAL(10, 2),
    estimated_fare DECIMAL(10, 2),
    actual_fare DECIMAL(10, 2),
    status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_vehicle_id (vehicle_id),
    INDEX idx_status (status),
    INDEX idx_booking_date (booking_date),
    INDEX idx_user_status (user_id, status)
);

-- ============================================================================
-- RATINGS TABLE - Customer reviews and ratings
-- ============================================================================
CREATE TABLE IF NOT EXISTS ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT CHECK(rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_booking_rating (booking_id, user_id),
    INDEX idx_rating (rating)
);

-- ============================================================================
-- PAYMENTS TABLE - Payment tracking for bookings
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    INDEX idx_booking_id (booking_id),
    INDEX idx_status (payment_status)
);

-- ============================================================================
-- INSERT DEMO DATA
-- ============================================================================

-- Insert Demo Users with Proper Roles
INSERT INTO users (name, email, phone, password_hash, role, address, city, state, pin_code, is_active) 
VALUES 
('John Doe', 'user@example.com', '+91-9876543210', 'user123', 'user', '123 Main St', 'Mumbai', 'Maharashtra', '400001', TRUE),
('Admin User', 'admin@example.com', '+91-9876543211', 'admin123', 'admin', '456 Admin Ave', 'Mumbai', 'Maharashtra', '400002', TRUE)
ON DUPLICATE KEY UPDATE 
    name=VALUES(name), 
    role=VALUES(role),
    is_active=VALUES(is_active);

-- Insert Sample Vehicles
INSERT INTO vehicles (name, vehicle_type, capacity, price_per_km, description, registration_number, is_available) 
VALUES
('Toyota Prius', 'economy', 4, 12.00, 'Economical and fuel-efficient vehicle for budget-friendly rides', 'MH-01-AB-1001', TRUE),
('BMW 3 Series', 'premium', 4, 28.00, 'Luxury sedan with premium features and comfortable interiors', 'MH-01-AB-1002', TRUE),
('Toyota 4Runner', 'suv', 7, 20.00, 'Spacious SUV perfect for group travel and family trips', 'MH-01-AB-1003', TRUE),
('Mercedes Van', 'van', 8, 24.00, 'Large van for group transport with ample luggage space', 'MH-01-AB-1004', TRUE)
ON DUPLICATE KEY UPDATE 
    name=VALUES(name),
    price_per_km=VALUES(price_per_km);

-- ============================================================================
-- CREATE VIEWS FOR EASIER QUERIES
-- ============================================================================

-- Active Bookings View (with customer and vehicle details)
CREATE OR REPLACE VIEW active_bookings AS
SELECT 
    b.id,
    b.user_id,
    u.name as customer_name,
    u.email as customer_email,
    u.phone as customer_phone,
    b.pickup_location,
    b.dropoff_location,
    b.booking_date,
    b.passengers,
    v.name as vehicle_name,
    v.vehicle_type,
    b.status,
    b.estimated_fare,
    b.actual_fare,
    b.created_at
FROM bookings b
JOIN users u ON b.user_id = u.id
LEFT JOIN vehicles v ON b.vehicle_id = v.id
WHERE b.status IN ('pending', 'confirmed', 'in_progress')
AND b.booking_date >= NOW()
ORDER BY b.booking_date ASC;

-- Booking Statistics View
CREATE OR REPLACE VIEW booking_statistics AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COUNT(b.id) as total_bookings,
    SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
    SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
    SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
    SUM(CASE WHEN b.status = 'completed' THEN b.actual_fare ELSE 0 END) as total_spent,
    COALESCE(AVG(r.rating), 0) as average_rating
FROM users u
LEFT JOIN bookings b ON u.id = b.user_id
LEFT JOIN ratings r ON b.id = r.booking_id
WHERE u.is_active = TRUE AND u.role = 'user'
GROUP BY u.id, u.name, u.email;

-- Vehicle Usage Statistics View
CREATE OR REPLACE VIEW vehicle_statistics AS
SELECT 
    v.id,
    v.name,
    v.vehicle_type,
    COUNT(b.id) as total_bookings,
    SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
    SUM(CASE WHEN b.status = 'completed' THEN b.actual_fare ELSE 0 END) as total_revenue,
    COALESCE(AVG(r.rating), 0) as average_rating,
    v.is_available
FROM vehicles v
LEFT JOIN bookings b ON v.id = b.vehicle_id
LEFT JOIN ratings r ON b.id = r.booking_id
GROUP BY v.id, v.name, v.vehicle_type, v.is_available;

-- ============================================================================
-- USEFUL QUERIES
-- ============================================================================

-- Get all active users with role:
-- SELECT id, name, email, phone, role FROM users WHERE is_active = TRUE ORDER BY role;

-- Get bookings for a specific user with all details:
-- SELECT b.*, u.name, u.email, u.phone, v.name as vehicle_name, v.vehicle_type
-- FROM bookings b
-- JOIN users u ON b.user_id = u.id
-- LEFT JOIN vehicles v ON b.vehicle_id = v.id
-- WHERE b.user_id = 1
-- ORDER BY b.booking_date DESC;

-- Get admin dashboard statistics:
-- SELECT 
--     COUNT(DISTINCT b.id) as total_bookings,
--     SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending,
--     SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
--     SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
--     SUM(CASE WHEN b.status = 'completed' THEN b.actual_fare ELSE 0 END) as total_revenue
-- FROM bookings b;

-- Get pending bookings for admin review:
-- SELECT b.*, u.name, u.phone, u.email, v.name as vehicle_name
-- FROM bookings b
-- JOIN users u ON b.user_id = u.id
-- LEFT JOIN vehicles v ON b.vehicle_id = v.id
-- WHERE b.status = 'pending'
-- ORDER BY b.booking_date ASC;

-- Get available vehicles:
-- SELECT * FROM vehicles WHERE is_available = TRUE;

-- Get revenue by vehicle type:
-- SELECT b.vehicle_type, COUNT(*) as bookings, SUM(b.actual_fare) as total_revenue, AVG(b.actual_fare) as avg_fare
-- FROM bookings b
-- WHERE b.status = 'completed'
-- GROUP BY b.vehicle_type;

-- ============================================================================
-- PRICING INFORMATION (Indian Rupees - ₹)
-- ============================================================================
-- Economy:  ₹12/km  (Toyota Prius)
-- Premium:  ₹28/km  (BMW 3 Series)
-- SUV:      ₹20/km  (Toyota 4Runner)
-- Van:      ₹24/km  (Mercedes Van)
-- ============================================================================
