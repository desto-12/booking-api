require('dotenv').config();

// Import the required modules
const express = require('express');
const mysql = require('mysql2');

// Create an instance of Express
const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Configure your database connection using environment variables
const db = mysql.createConnection({
  host: process.env.DB_HOST,           
  user: process.env.DB_USER,           
  password: process.env.DB_PASSWORD,   
  database: process.env.DB_DATABASE,       
  port: process.env.DB_PORT || 3306,   
});

// Connect to the database
db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1); // Exit the process with failure
  }
  console.log("Connected to the database successfully!");
});

// Create a simple route to test the server
app.get('/', (req, res) => {
  res.send('Booking API is running!');
});

// POST endpoint to create a new booking
app.post('/api/book', (req, res) => {
  const { name, email, phone, business_type, booking_date, booking_time } = req.body;

  // Basic validation: ensure required fields are provided
  if (!name || !email || !booking_date || !booking_time) {
    return res.status(400).json({ error: 'Missing required booking information.' });
  }

  const bookingQuery = `
    INSERT INTO bookings (name, email, phone, business_type, booking_date, booking_time)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(bookingQuery, [name, email, phone, business_type, booking_date, booking_time], (err, result) => {
    if (err) {
      console.error('Error inserting booking:', err);
      return res.status(500).json({ error: 'Failed to create booking.' });
    }

    const updateSlotQuery = `
      UPDATE availability
      SET is_booked = TRUE
      WHERE available_date = ? AND available_time = ?
    `;
    db.query(updateSlotQuery, [booking_date, booking_time], (err) => {
      if (err) {
        console.error('Error updating slot availability:', err);
        return res.status(500).json({ error: 'Booking created but failed to update slot availability.' });
      }

      res.status(200).json({ message: 'Booking created successfully.' });
    });
  });
});

// Get all bookings
app.get('/api/bookings', (req, res) => {
  const query = 'SELECT * FROM bookings';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching bookings:', err);
      return res.status(500).json({ error: 'Failed to fetch bookings' });
    }

    res.status(200).json(results);
  });
});

// Check if a slot is available
app.get('/api/availability', (req, res) => {
  const { booking_date, booking_time } = req.query;
  const query = `
    SELECT is_booked FROM availability
    WHERE available_date = ? AND available_time = ?
  `;

  db.query(query, [booking_date, booking_time], (err, results) => {
    if (err) {
      console.error('Error checking availability:', err);
      return res.status(500).json({ error: 'Failed to check availability' });
    }

    if (results.length > 0 && results[0].is_booked) {
      return res.status(200).json({ available: false, message: 'Slot is already booked' });
    }

    res.status(200).json({ available: true, message: 'Slot is available' });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
