// Authentication Check - Require login before accessing website
function checkAuthentication() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    // If not logged in and on index.html, redirect to login
    if (!currentUser && window.location.pathname.includes('index.html') || 
        (!currentUser && window.location.pathname === '/')) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Check authentication on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuthentication);
} else {
    checkAuthentication();
}

// Authentication Menu Handler
function updateAuthMenu() {
    const authMenu = document.getElementById('authMenu');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser) {
        authMenu.innerHTML = `
            <a href="#" class="user-menu" id="userMenuBtn">
                <i class="fas fa-user-circle"></i> ${currentUser.name}
            </a>
            <div class="dropdown-menu" id="userDropdown" style="display: none;">
                <a href="${currentUser.role === 'admin' ? 'admin.html' : 'user-dashboard.html'}" class="dropdown-item">
                    <i class="fas fa-${currentUser.role === 'admin' ? 'tachometer-alt' : 'chart-line'}"></i> 
                    ${currentUser.role === 'admin' ? 'Admin Dashboard' : 'My Dashboard'}
                </a>
                <a href="#" class="dropdown-item" onclick="logout(event)">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            </div>
        `;
        
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');
        
        userMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';
        });
        
        document.addEventListener('click', (e) => {
            if (!authMenu.contains(e.target)) {
                userDropdown.style.display = 'none';
            }
        });
    }
}

function logout(event) {
    event.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}

// Initialize auth menu on page load
document.addEventListener('DOMContentLoaded', updateAuthMenu);

// Mobile Menu Toggle
const hamburger = document.querySelector('.hamburger');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const navMenu = document.getElementById('navMenu');

// Mobile menu for the new design
if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        menuToggle.classList.toggle('active');
    });

    // Close menu when link is clicked
    document.querySelectorAll('#navMenu a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            menuToggle.classList.remove('active');
        });
    });
}

// Legacy hamburger support
if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Close menu when link is clicked
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });
}

// Smooth scroll to booking section
function scrollToBooking() {
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
}

// Form Submission Handler
const bookingForm = document.getElementById('bookingForm');
const formMessage = document.getElementById('message');

if (bookingForm && formMessage) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get current user
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.id) {
            showMessage('Please log in to make a booking', 'error');
            return;
        }

        // Get form data
        const formData = {
            user_id: user.id,
            pickup_location: document.getElementById('pickup').value,
            dropoff_location: document.getElementById('dropoff').value,
            booking_date: document.getElementById('date').value,
            passengers: document.getElementById('passengers').value
        };

        // Validate form data
        if (!formData.pickup_location || !formData.dropoff_location || !formData.booking_date || !formData.passengers) {
            showMessage('Please fill all required fields', 'error');
            return;
        }

        try {
            // Disable submit button
            const submitBtn = bookingForm.querySelector('.submit-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            }

            // Send data to server
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                showMessage(`✅ Booking successful! Your booking ID: ${result.bookingId}`, 'success');
                bookingForm.reset();
                
                // Store booking info in localStorage for tracking
                const userBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
                userBookings.push({
                    bookingId: result.bookingId,
                    email: user.email,
                    date: new Date().toISOString()
                });
                localStorage.setItem('userBookings', JSON.stringify(userBookings));
                
                // Show success notification
                showNotification('Booking created successfully! Check your email for confirmation.', 'success');
            } else {
                showMessage(result.error || 'Failed to create booking', 'error');
            }

            // Re-enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Confirm Booking';
            }

        } catch (error) {
            console.error('Error:', error);
            showMessage('An error occurred. Please try again.', 'error');
            const submitBtn = bookingForm.querySelector('.submit-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Confirm Booking';
            }
        }
    });
}

// Track Booking Form Handler
const trackForm = document.getElementById('trackForm');
if (trackForm) {
    trackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('trackEmail').value;
        const phone = document.getElementById('trackPhone').value;
        
        try {
            // Show loading state
            const submitBtn = trackForm.querySelector('.btn');
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
            submitBtn.disabled = true;
            
            // Fetch bookings
            const response = await fetch('/api/bookings');
            if (!response.ok) throw new Error('Failed to fetch bookings');
            
            const allBookings = await response.json();
            
            // Filter bookings by email or phone
            const userBookings = allBookings.filter(booking => 
                booking.customer_email.toLowerCase() === email.toLowerCase() ||
                booking.customer_phone === phone
            );
            
            // Display results
            displayTrackingResults(userBookings);
            
            // Re-enable button
            submitBtn.innerHTML = '<i class="fas fa-search"></i> Find My Bookings';
            submitBtn.disabled = false;
            
        } catch (error) {
            console.error('Error tracking booking:', error);
            showNotification('Failed to fetch bookings. Please try again.', 'error');
            
            const submitBtn = trackForm.querySelector('.btn');
            submitBtn.innerHTML = '<i class="fas fa-search"></i> Find My Bookings';
            submitBtn.disabled = false;
        }
    });
}

// Display Tracking Results
function displayTrackingResults(bookings) {
    const resultsContainer = document.getElementById('trackResults');
    if (!resultsContainer) return;
    
    if (bookings.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-inbox"></i>
                <h3>No Bookings Found</h3>
                <p>We couldn't find any bookings with the provided information.</p>
            </div>
        `;
        resultsContainer.style.display = 'block';
        return;
    }
    
    resultsContainer.innerHTML = `
        <h3><i class="fas fa-list"></i> Your Bookings (${bookings.length})</h3>
        <div class="bookings-list">
            ${bookings.map(booking => `
                <div class="booking-card">
                    <div class="booking-header">
                        <h4>Booking #${booking.id}</h4>
                        <span class="status-badge ${booking.status}">${booking.status}</span>
                    </div>
                    <div class="booking-details">
                        <div class="detail-row">
                            <i class="fas fa-user"></i>
                            <span>${booking.customer_name}</span>
                        </div>
                        <div class="detail-row">
                            <i class="fas fa-map-marker-alt"></i>
                            <span><strong>From:</strong> ${booking.pickup_location}</span>
                        </div>
                        <div class="detail-row">
                            <i class="fas fa-map-marker-alt"></i>
                            <span><strong>To:</strong> ${booking.dropoff_location}</span>
                        </div>
                        <div class="detail-row">
                            <i class="fas fa-calendar"></i>
                            <span>${formatDateTime(booking.booking_date)}</span>
                        </div>
                        <div class="detail-row">
                            <i class="fas fa-car"></i>
                            <span>${booking.vehicle_type || 'Standard'}</span>
                        </div>
                        <div class="detail-row">
                            <i class="fas fa-users"></i>
                            <span>${booking.passengers} passenger(s)</span>
                        </div>
                    </div>
                    <div class="booking-status-info">
                        ${getStatusMessage(booking.status)}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    resultsContainer.style.display = 'block';
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Get Status Message
function getStatusMessage(status) {
    const messages = {
        'pending': '<i class="fas fa-clock"></i> Your booking is pending confirmation. We\'ll contact you within 24 hours.',
        'confirmed': '<i class="fas fa-check-circle"></i> Your booking is confirmed! We look forward to serving you.',
        'completed': '<i class="fas fa-flag-checkered"></i> This booking has been completed. Thank you for choosing TransportHub!',
        'cancelled': '<i class="fas fa-times-circle"></i> This booking has been cancelled.'
    };
    
    return `<div class="status-message status-${status}">${messages[status] || 'Status unknown'}</div>`;
}

// Format DateTime
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Form Validation
function validateForm(data) {
    return (
        data.pickup.trim() !== '' &&
        data.dropoff.trim() !== '' &&
        data.date !== '' &&
        data.passengers !== '' &&
        data.name.trim() !== '' &&
        data.phone.trim() !== '' &&
        data.email.trim() !== '' &&
        isValidEmail(data.email)
    );
}

// Email Validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show/Hide Message
function showMessage(message, type) {
    if (!formMessage) return;
    
    formMessage.innerHTML = message;
    formMessage.className = `message ${type}`;
    formMessage.style.display = 'block';
    
    // Auto-remove message after 5 seconds
    setTimeout(() => {
        if (formMessage) {
            formMessage.style.display = 'none';
            formMessage.className = 'message';
        }
    }, 5000);
}

// Modern Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        border-radius: 0.75rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 1rem;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Add notification animations
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0.25rem;
        opacity: 0.8;
        transition: opacity 0.2s;
    }
    
    .notification-close:hover {
        opacity: 1;
    }
`;
document.head.appendChild(notificationStyles);

// Set minimum date to today
function setMinDate() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dateInput.min = now.toISOString().slice(0, 16);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setMinDate();
    
    // Show recent bookings notification if any
    const userBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
    if (userBookings.length > 0) {
        console.log('User has bookings:', userBookings.length);
    }
});

// Add responsive behavior
window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && navMenu) {
        navMenu.classList.remove('active');
    }
    if (window.innerWidth > 768 && navLinks) {
        navLinks.classList.remove('active');
    }
});

// Smooth scroll for all anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId && targetId !== '#') {
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});
