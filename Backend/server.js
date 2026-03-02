const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const app = express();
const pool = require('./config/database');

const BCRYPT_ROUNDS = 12;

// Security headers (allow inline styles/scripts for existing frontend)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Middleware
// NOTE: In production, restrict origin to your domain.
app.use(cors({
  origin: (origin, callback) => {
    const allowed = ['http://localhost:3000', 'http://127.0.0.1:3000'];
    if (!origin || allowed.includes(origin)) return callback(null, true);
    callback(new Error('CORS: origin not allowed'));
  },
  optionsSuccessStatus: 200
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'Frontend')));

// Rate limiting – auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 requests per window
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting – contact form
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 contact submissions per hour
  message: { error: 'Too many messages sent. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const PORT = process.env.PORT || 3000;

// DEMO ONLY: Passwords stored as plaintext. In production, use bcrypt hashing.
const USERS = {
  'user@example.com': { password: 'User123', role: 'user', name: 'John Doe' },
  'admin@example.com': { password: 'Admin123', role: 'admin', name: 'Admin User' }
};

const demoBookings = [];
let demoBookingIdCounter = 1000;

// Routes

// Authentication Routes
app.post('/api/login', authLimiter, async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }

  const demoUser = USERS[email];
  const canUseDemoCredentials = demoUser && demoUser.password === password && demoUser.role === role;

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

    if (rows.length === 0) {
      if (canUseDemoCredentials) {
        return res.json({
          message: 'Login successful (Demo Mode)',
          user: {
            id: role === 'admin' ? 999 : 1,
            email: email,
            name: demoUser.name,
            role: role
          }
        });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Support both bcrypt hashes and legacy plaintext passwords
    const storedHash = rows[0].password_hash;
    const isBcrypt = storedHash && storedHash.startsWith('$2');
    const passwordMatch = isBcrypt
      ? await bcrypt.compare(password, storedHash)
      : storedHash === password;

    if (!passwordMatch) {
      if (canUseDemoCredentials) {
        return res.json({
          message: 'Login successful (Demo Mode)',
          user: {
            id: role === 'admin' ? 999 : 1,
            email: email,
            name: demoUser.name,
            role: role
          }
        });
      }
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

    if (canUseDemoCredentials) {
      return res.json({
        message: 'Login successful (Demo Mode)',
        user: {
          id: role === 'admin' ? 999 : 1,
          email: email,
          name: demoUser.name,
          role: role
        }
      });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

// User Registration
app.post('/api/register', authLimiter, async (req, res) => {
  const rawName = String(req.body.name || '').trim();
  const rawEmail = String(req.body.email || '').trim().toLowerCase();
  const rawPhone = String(req.body.phone || '').trim();
  const password = req.body.password;

  if (!rawName || !rawEmail || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (rawName.length > 100) {
    return res.status(400).json({ error: 'Name is too long' });
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and numbers' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [existingUser] = await connection.query('SELECT id FROM users WHERE email = ?', [rawEmail]);

    if (existingUser.length > 0) {
      connection.release();
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password with bcrypt before storing
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const [result] = await connection.query(
      'INSERT INTO users (name, email, phone, password_hash, created_at) VALUES (?, ?, ?, ?, NOW())',
      [rawName, rawEmail, rawPhone || null, hashedPassword]
    );

    connection.release();
    res.status(201).json({
      message: 'User registered successfully',
      user: { id: result.insertId, name: rawName, email: rawEmail, role: 'user' }
    });
  } catch (error) {
    // Always release connection on error
    if (connection) { try { connection.release(); } catch (_) { } }
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
    res.json([...rows, ...demoBookings]);
  } catch (error) {
    console.error('Database error:', error);
    res.json(demoBookings);
  }
});

// Get bookings for a specific user
app.get('/api/my-bookings/:userId', async (req, res) => {
  const userId = Number(req.params.userId);

  if (!Number.isFinite(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const demoRows = demoBookings.filter((booking) => Number(booking.user_id) === userId);

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
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC
    `, [userId]);
    connection.release();
    return res.json([...rows, ...demoRows]);
  } catch (error) {
    console.error('Database error:', error);
    return res.json(demoRows);
  }
});

// Create a new booking
app.post('/api/bookings', async (req, res) => {
  const {
    user_id,
    user_name,
    user_email,
    pickup_location,
    dropoff_location,
    booking_date,
    passengers,
    payment_method,
    payment_status,
    transaction_ref,
    fare
  } = req.body;

  if (!user_id || !pickup_location || !dropoff_location || !booking_date || !passengers) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const passengersNum = Number(passengers);
  if (!Number.isFinite(passengersNum) || passengersNum <= 0) {
    return res.status(400).json({ error: 'Passengers must be a positive number' });
  }

  const normalizedPaymentMethodRaw = String(payment_method || 'CASH').trim().toUpperCase();
  const normalizedPaymentMethod = normalizedPaymentMethodRaw === 'UPI' ? 'GPAY' : normalizedPaymentMethodRaw;
  const allowedPaymentMethods = ['GPAY', 'CARD', 'NETBANKING', 'CASH'];
  if (!allowedPaymentMethods.includes(normalizedPaymentMethod)) {
    return res.status(400).json({ error: 'Invalid payment method' });
  }

  const normalizedPaymentStatus = String(payment_status || (normalizedPaymentMethod === 'CASH' ? 'pending' : 'paid')).trim().toLowerCase();
  const allowedPaymentStatus = ['pending', 'paid', 'failed', 'refunded'];
  if (!allowedPaymentStatus.includes(normalizedPaymentStatus)) {
    return res.status(400).json({ error: 'Invalid payment status' });
  }

  const transactionRef = transaction_ref ? String(transaction_ref).trim() : null;
  const fareAmount = Number(fare);
  const normalizedFare = Number.isFinite(fareAmount) && fareAmount >= 0 ? fareAmount : null;

  const createDemoBooking = () => {
    const demoBooking = {
      id: demoBookingIdCounter++,
      user_id,
      pickup_location,
      dropoff_location,
      booking_date,
      passengers: passengersNum,
      status: 'pending',
      payment_method: normalizedPaymentMethod,
      payment_status: normalizedPaymentStatus,
      transaction_ref: transactionRef,
      fare: normalizedFare,
      customer_name: user_name || 'Demo User',
      customer_email: user_email || 'demo@example.com',
      customer_phone: null,
      driver_name: null,
      created_at: new Date().toISOString()
    };

    demoBookings.unshift(demoBooking);
    return demoBooking;
  };

  try {
    const connection = await pool.getConnection();

    // Verify user exists
    const [userCheck] = await connection.query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (userCheck.length === 0) {
      connection.release();
      const demoBooking = createDemoBooking();
      return res.status(201).json({
        message: 'Booking created successfully (Demo Mode)',
        bookingId: demoBooking.id
      });
    }

    let result;

    try {
      const queryWithPayment = `
        INSERT INTO bookings (
          user_id,
          pickup_location,
          dropoff_location,
          booking_date,
          passengers,
          status,
          fare,
          payment_method,
          payment_status,
          transaction_ref,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW())
      `;

      [result] = await connection.query(queryWithPayment, [
        user_id,
        pickup_location,
        dropoff_location,
        booking_date,
        passengersNum,
        normalizedFare,
        normalizedPaymentMethod,
        normalizedPaymentStatus,
        transactionRef
      ]);
    } catch (insertError) {
      if (insertError && insertError.code === 'ER_BAD_FIELD_ERROR') {
        const legacyQuery = `
          INSERT INTO bookings (user_id, pickup_location, dropoff_location, booking_date, passengers, status, fare, created_at)
          VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW())
        `;

        [result] = await connection.query(legacyQuery, [
          user_id,
          pickup_location,
          dropoff_location,
          booking_date,
          passengersNum,
          normalizedFare
        ]);
      } else {
        throw insertError;
      }
    }

    connection.release();

    res.status(201).json({
      message: 'Booking created successfully',
      bookingId: result.insertId
    });
  } catch (error) {
    console.error('Database error:', error);
    const demoBooking = createDemoBooking();
    res.status(201).json({
      message: 'Booking created successfully (Demo Mode)',
      bookingId: demoBooking.id
    });
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

  const bookingId = Number(req.params.id);

  if (!Number.isFinite(bookingId)) {
    return res.status(400).json({ error: 'Invalid booking ID' });
  }

  const demoIndex = demoBookings.findIndex((booking) => Number(booking.id) === bookingId);
  if (demoIndex !== -1) {
    demoBookings[demoIndex].status = status;
    return res.json({ message: 'Booking updated successfully (Demo Mode)' });
  }

  try {
    const connection = await pool.getConnection();
    await connection.query('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId]);
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

// ─── Contact Form ──────────────────────────────────────────────────
app.post('/api/contact', contactLimiter, async (req, res) => {
  const name    = String(req.body.name    || '').trim();
  const email   = String(req.body.email   || '').trim().toLowerCase();
  const phone   = String(req.body.phone   || '').trim();
  const subject = String(req.body.subject || '').trim();
  const message = String(req.body.message || '').trim();

  // Validation
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Name, email, subject, and message are required.' });
  }

  if (name.length > 100 || subject.length > 200 || message.length > 2000) {
    return res.status(400).json({ error: 'One or more fields exceed the maximum length.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  if (phone && !/^\+?[\d\s\-()]{7,20}$/.test(phone)) {
    return res.status(400).json({ error: 'Please provide a valid phone number.' });
  }

  try {
    const connection = await pool.getConnection();
    await connection.query(
      `INSERT INTO contact_messages (name, email, phone, subject, message, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [name, email, phone || null, subject, message]
    );
    connection.release();
    res.status(201).json({ message: 'Your message has been received. We will get back to you shortly.' });
  } catch (error) {
    console.error('Contact form DB error:', error.message);
    // Even if the DB is down, acknowledge the message so the user isn't stuck
    console.log('Contact submission (fallback):', { name, email, phone, subject, message });
    res.status(201).json({ message: 'Your message has been received. We will get back to you shortly.' });
  }
});

// Home route - serve landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Frontend', 'index.html'));
});

// Dashboard Stats API
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('CALL sp_dashboard_stats()');
    connection.release();
    res.json(rows[0] ? rows[0][0] : {});
  } catch (error) {
    console.error('Dashboard stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Friendly page routes
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Frontend', 'login.html'));
});

app.get('/results', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Frontend', 'results.html'));
});

// Admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Frontend', 'admin-dashboard.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Frontend', 'user-dashboard.html'));
});

app.get('/my-bookings', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Frontend', 'user-dashboard.html'));
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Navigate to: http://localhost:${PORT}/`);
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
