# TransportHub - Responsive Transport Website

A modern, responsive transport booking website built with Node.js, Express, and MySQL.

## Features

- ✅ Fully responsive design (mobile, tablet, desktop)
- ✅ Intuitive booking system
- ✅ Multiple vehicle types (Economy, Premium, SUV, Van)
- ✅ Real-time form validation
- ✅ MySQL database integration
- ✅ RESTful API endpoints
- ✅ Professional UI/UX design
- ✅ Mobile hamburger menu

## Tech Stack

### Frontend
- HTML5
- CSS3 (Responsive Design, Flexbox, Grid)
- Vanilla JavaScript (ES6+)

### Backend
- Node.js
- Express.js
- MySQL2 (with connection pooling)

### Database
- MySQL 5.7+

## Project Structure

```
SNR/
├── public/
│   ├── index.html          # Main HTML file
│   ├── styles.css          # Responsive stylesheets
│   └── script.js           # Client-side JavaScript
├── config/
│   └── database.js         # MySQL connection config
├── server.js               # Express server
├── package.json            # Project dependencies
├── .env                    # Environment variables
└── database.sql            # SQL setup script
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server (v5.7 or higher)
- MySQL Workbench (optional, for database management)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set Up MySQL Database

1. Open MySQL Workbench
2. Create a new connection or use existing one
3. Open a new SQL tab
4. Copy and run the contents of `database.sql`:
   - Right-click on your connection
   - Select "Open Connection"
   - Click the "New Query Tab" button
   - Open `database.sql` and run the script
   - Or copy the commands and paste in a new query window

Alternatively, from command line:
```bash
mysql -u root -p < database.sql
```

### Step 3: Configure Environment Variables

Edit `.env` file with your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password      # Change to your MySQL password
DB_NAME=transport_db
PORT=3000
NODE_ENV=development
```

### Step 4: Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Bookings

**Get All Bookings**
```
GET /api/bookings
```

**Create a Booking**
```
POST /api/bookings
Content-Type: application/json

{
  "pickup": "123 Main St",
  "dropoff": "456 Park Ave",
  "date": "2026-02-15T14:30",
  "passengers": "3",
  "vehicle_type": "premium",
  "name": "John Doe",
  "phone": "+1 (555) 123-4567",
  "email": "john@example.com"
}
```

**Get Booking by ID**
```
GET /api/bookings/:id
```

**Update Booking Status**
```
PUT /api/bookings/:id
Content-Type: application/json

{
  "status": "confirmed"  // pending, confirmed, completed, cancelled
}
```

**Delete Booking**
```
DELETE /api/bookings/:id
```

### Vehicles

**Get All Vehicles**
```
GET /api/vehicles
```

## Responsive Design Features

- **Mobile First Approach**: Optimized for all screen sizes
- **Breakpoints**:
  - Desktop: 1024px and above
  - Tablet: 768px - 1023px
  - Mobile: Below 768px
  - Small Mobile: Below 480px

- **Responsive Elements**:
  - Navigation with hamburger menu
  - Flexible grid layouts
  - Touch-friendly input fields
  - Optimized images and typography

## Database Schema

### bookings table
- id (Primary Key)
- pickup (Address)
- dropoff (Address)
- date (DateTime)
- passengers (Number)
- vehicle_type (Type)
- name (User Name)
- phone (Contact)
- email (Contact)
- status (pending/confirmed/completed/cancelled)
- created_at (Timestamp)
- updated_at (Timestamp)

### vehicles table
- id (Primary Key)
- name (Vehicle Name)
- vehicle_type (Type)
- capacity (Passenger Count)
- price_per_km (Rate)
- description (Details)
- is_available (Boolean)

### users table (optional)
- id (Primary Key)
- name, email, phone
- password_hash
- address, preferences
- created_at

### drivers table (optional)
- id (Primary Key)
- name, email, phone
- license_number
- vehicle_id (Foreign Key)
- status

## Usage Example

1. **Open the website**: Navigate to `http://localhost:3000`
2. **Fill the booking form**:
   - Enter pickup location
   - Enter dropoff location
   - Select travel date and time
   - Choose number of passengers
   - Select vehicle type
   - Enter personal details
3. **Submit the form** to create a booking
4. **Confirmation**: You'll receive a booking ID on success

## Troubleshooting

### MySQL Connection Error
- Verify MySQL is running
- Check credentials in `.env` file
- Ensure `transport_db` database exists

### Port Already in Use
- Change PORT in `.env` file
- Or kill process using port 3000: `lsof -ti:3000 | xargs kill`

### Dependencies Not Installing
- Delete `node_modules` folder
- Delete `package-lock.json`
- Run `npm install` again

## Future Enhancements

- [ ] User authentication & registration
- [ ] Payment integration
- [ ] Real-time tracking
- [ ] Rating & review system
- [ ] Driver management
- [ ] Admin dashboard
- [ ] Email notifications
- [ ] SMS alerts
- [ ] Booking history
- [ ] Multiple language support

## License

MIT License - Feel free to use for personal or commercial projects

## Support

For issues or questions, please check:
1. `.env` configuration
2. MySQL connection status
3. Server logs in terminal
4. Browser console for frontend errors (F12)

## Version

v1.0.0 - Initial Release

---

**Ready to book your ride!** 🚗✨
