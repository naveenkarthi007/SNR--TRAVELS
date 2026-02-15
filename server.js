const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const pool = require('./config/database');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// Demo users (in production, use database with hashed passwords)
const USERS = {
  'user@example.com': { password: 'user123', role: 'user', name: 'John Doe' },
  'admin@example.com': { password: 'admin123', role: 'admin', name: 'Admin User' }
};

// Routes

// Authentication Routes
app.post('/api/login', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }

  try {
    // First try to use database
    const connection = await Promise.race([
      pool.getConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 5000)
      )
    ]);
    
    const [rows] = await connection.query('SELECT id, name, email, password_hash, role FROM users WHERE email = ?', [email]);
    connection.release();

    if (rows.length === 0 || rows[0].password_hash !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    
    if (user.role !== role) {
      return res.status(401).json({ error: 'Invalid role for this account' });
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Database error:', error.message);
    
    // Fallback to demo credentials if database is unavailable
    if (USERS[email] && USERS[email].password === password) {
      const userRole = USERS[email].role;
      if (userRole === role) {
        return res.json({
          message: 'Login successful (Demo Mode)',
          user: {
            id: 1,
            email: email,
            name: USERS[email].name,
            role: userRole
          }
        });
      }
    }
    
    return res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

// User Registration
app.post('/api/register', async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and numbers' });
  }

  try {
    // Check if email already exists
    const connection = await pool.getConnection();
    const [existingUser] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
    
    if (existingUser.length > 0) {
      connection.release();
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Insert new user
    const [result] = await connection.query(
      'INSERT INTO users (name, email, phone, password_hash, created_at) VALUES (?, ?, ?, ?, NOW())',
      [name, email, phone || null, password]
    );
    
    connection.release();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: result.insertId,
        name: name,
        email: email,
        role: 'user'
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Get all bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(`
      SELECT 
        b.*,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        d.name as driver_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN drivers d ON b.driver_id = d.id
      ORDER BY b.booking_date DESC
    `);
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Create a new booking
app.post('/api/bookings', async (req, res) => {
  const { user_id, pickup_location, dropoff_location, booking_date, passengers } = req.body;

  if (!user_id || !pickup_location || !dropoff_location || !booking_date || !passengers) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const passengersNum = Number(passengers);
  if (!Number.isFinite(passengersNum) || passengersNum <= 0) {
    return res.status(400).json({ error: 'Passengers must be a positive number' });
  }

  try {
    const connection = await pool.getConnection();
    
    // Verify user exists
    const [userCheck] = await connection.query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (userCheck.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'User not found' });
    }

    const query = `
      INSERT INTO bookings (user_id, pickup_location, dropoff_location, booking_date, passengers, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', NOW())
    `;
    
    const [result] = await connection.query(query, [
      user_id,
      pickup_location,
      dropoff_location,
      booking_date,
      passengersNum
    ]);
    
    connection.release();

    res.status(201).json({
      message: 'Booking created successfully',
      bookingId: result.insertId
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get booking by ID
app.get('/api/bookings/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(`
      SELECT 
        b.*,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        v.name as vehicle_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.id = ?
    `, [req.params.id]);
    connection.release();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Update booking status
app.put('/api/bookings/:id', async (req, res) => {
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const connection = await pool.getConnection();
    await connection.query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
    connection.release();
    
    res.json({ message: 'Booking updated successfully' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Delete booking
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query('DELETE FROM bookings WHERE id = ?', [req.params.id]);
    connection.release();
    
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// Get vehicles
app.get('/api/vehicles', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM vehicles');
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// Create a new vehicle
app.post('/api/vehicles', async (req, res) => {
  const { name, vehicle_type, capacity, price_per_km, description, is_available } = req.body;

  if (!name || !vehicle_type || !capacity || !price_per_km) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const query = `
      INSERT INTO vehicles (name, vehicle_type, capacity, price_per_km, description, is_available, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    const [result] = await pool.query(query, [
      name,
      vehicle_type,
      capacity,
      price_per_km,
      description || null,
      is_available !== undefined ? is_available : true
    ]);

    res.status(201).json({
      message: 'Vehicle created successfully',
      vehicleId: result.insertId
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

// Update vehicle
app.put('/api/vehicles/:id', async (req, res) => {
  const { is_available } = req.body;
  
  try {
    const connection = await pool.getConnection();
    await connection.query('UPDATE vehicles SET is_available = ? WHERE id = ?', [is_available, req.params.id]);
    connection.release();
    
    res.json({ message: 'Vehicle updated successfully' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

// Delete vehicle
app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
    connection.release();
    
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT id, name, email, phone, role, is_active, created_at FROM users ORDER BY created_at DESC');
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all drivers
app.get('/api/drivers', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT id, name, phone, license_number, is_available, rating, created_at FROM drivers ORDER BY created_at DESC');
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Home route - redirect to login page
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Navigate to: http://localhost:${PORT}/login.html`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
