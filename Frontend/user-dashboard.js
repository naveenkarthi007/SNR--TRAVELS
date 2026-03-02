const currentUser = (() => {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
    }
})();

if (!currentUser || currentUser.role !== 'user') {
    window.location.href = 'login.html';
}

const myBookingBody = document.getElementById('myBookingBody');
const myBookingSummary = document.getElementById('myBookingSummary');
const bookingSearch = document.getElementById('bookingSearch');
const statusFilter = document.getElementById('statusFilter');

const totalBookingsEl = document.getElementById('totalBookings');
const confirmedBookingsEl = document.getElementById('confirmedBookings');
const completedBookingsEl = document.getElementById('completedBookings');
const paidAmountEl = document.getElementById('paidAmount');

const welcomeName = document.getElementById('welcomeName');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const footerYear = document.getElementById('footerYear');

let bookings = [];

// Footer year now handled by shared.js initFooterYear()

// Uses shared API_BASE from shared.js
const API_BASE_URL = (typeof API_BASE !== 'undefined') ? API_BASE : '';

// Delegate to shared Toast system (shared.js)
function showToast(message, type = 'info') {
    if (typeof Toast !== 'undefined' && Toast.show) {
        Toast.show(message, type);
    } else {
        console.warn('[Toast]', type, message);
    }
}

function esc(value) {
    if (value == null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function fmtDate(value) {
    if (!value) return '—';
    const dateValue = new Date(value);
    return Number.isNaN(dateValue.getTime())
        ? '—'
        : dateValue.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN')}` : '—';
}

function firstName(fullName) {
    if (!fullName) return 'Traveler';
    return fullName.trim().split(/\s+/)[0] || 'Traveler';
}

function statusBadge(status) {
    const normalized = String(status || 'pending').toLowerCase();
    return `<span class="badge ${esc(normalized)}">${normalized.toUpperCase()}</span>`;
}

function paymentBadge(paymentMethod, paymentStatus) {
    const method = String(paymentMethod || 'CASH').toUpperCase();
    const status = String(paymentStatus || 'pending').toLowerCase();
    const cls = status === 'paid' ? 'paid' : 'pending-pay';
    return `<div><span class="badge ${cls}">${status.toUpperCase()}</span><div style="font-size:0.75rem;color:#6b7fa0;margin-top:2px">${esc(method)}</div></div>`;
}

function canCancelBooking(booking) {
    const status = String(booking.status || '').toLowerCase();
    return status === 'pending' || status === 'confirmed';
}

function getFilteredBookings() {
    const query = (bookingSearch?.value || '').trim().toLowerCase();
    const status = statusFilter?.value || 'all';

    return bookings.filter((booking) => {
        const matchesQuery = !query
            || String(booking.id).includes(query)
            || String(booking.pickup_location || '').toLowerCase().includes(query)
            || String(booking.dropoff_location || '').toLowerCase().includes(query);

        const matchesStatus = status === 'all' || String(booking.status || '').toLowerCase() === status;
        return matchesQuery && matchesStatus;
    });
}

function renderSummary(data) {
    const total = data.length;
    const confirmed = data.filter((booking) => String(booking.status || '').toLowerCase() === 'confirmed').length;
    const completed = data.filter((booking) => String(booking.status || '').toLowerCase() === 'completed').length;
    const paidAmount = data.reduce((sum, booking) => {
        return String(booking.payment_status || '').toLowerCase() === 'paid' ? sum + (Number(booking.fare) || 0) : sum;
    }, 0);

    totalBookingsEl.textContent = String(total);
    confirmedBookingsEl.textContent = String(confirmed);
    completedBookingsEl.textContent = String(completed);
    paidAmountEl.textContent = `₹${paidAmount.toLocaleString('en-IN')}`;
}

function renderTable() {
    const filtered = getFilteredBookings();

    myBookingSummary.textContent = `Showing ${filtered.length} booking(s) from ${bookings.length} total.`;
    renderSummary(filtered);

    if (!filtered.length) {
        myBookingBody.innerHTML = `<tr><td colspan="8"><div class="empty"><i class="fa-solid fa-inbox" style="font-size:1.5rem;opacity:0.4;margin-bottom:8px;display:block"></i>No bookings found. <a href="results.html" style="color:var(--primary);font-weight:700">Book your first trip!</a></div></td></tr>`;
        return;
    }

    myBookingBody.innerHTML = filtered.map((booking) => `
        <tr>
            <td><strong>#${esc(booking.id)}</strong></td>
            <td>
                <div style="font-weight:600">${esc(booking.pickup_location || '—')}</div>
                <div style="color:var(--muted);font-size:0.82rem">→ ${esc(booking.dropoff_location || '—')}</div>
            </td>
            <td>${fmtDate(booking.booking_date)}</td>
            <td>${esc(booking.passengers || 1)}</td>
            <td>${fmtCurrency(booking.fare)}</td>
            <td>${paymentBadge(booking.payment_method, booking.payment_status)}</td>
            <td>${statusBadge(booking.status)}</td>
            <td>
                ${canCancelBooking(booking) ? `<button class="cancel-btn" data-id="${esc(booking.id)}" type="button"><i class="fa-solid fa-xmark"></i> Cancel</button>` : '<span style="color:var(--muted);font-size:0.8rem">—</span>'}
            </td>
        </tr>
    `).join('');
}

async function cancelBooking(bookingId, button) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }

    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner" style="animation:spin 0.8s linear infinite"></i>';

    if (!document.getElementById('spinStyle')) {
        const s = document.createElement('style');
        s.id = 'spinStyle';
        s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(s);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled' })
        });

        if (!response.ok) {
            throw new Error('Failed');
        }

        bookings = bookings.map((booking) => {
            return Number(booking.id) === Number(bookingId) ? { ...booking, status: 'cancelled' } : booking;
        });

        renderTable();
        showToast(`Booking #${bookingId} cancelled successfully.`, 'success');
    } catch {
        showToast('Could not cancel booking. Please try again.', 'error');
        button.disabled = false;
        button.innerHTML = '<i class="fa-solid fa-xmark"></i> Cancel';
    }
}

async function loadMyBookings() {
    myBookingSummary.textContent = 'Loading bookings...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/my-bookings/${currentUser.id}`);

        if (response.ok) {
            bookings = await response.json().catch(() => []);
        } else {
            const allResponse = await fetch(`${API_BASE_URL}/api/bookings`);
            const allData = allResponse.ok ? await allResponse.json().catch(() => []) : [];
            bookings = allData.filter((booking) => Number(booking.user_id) === Number(currentUser.id));
        }

        if (!Array.isArray(bookings)) {
            bookings = [];
        }

        bookings.sort((a, b) => new Date(b.booking_date || 0).getTime() - new Date(a.booking_date || 0).getTime());
        renderTable();
    } catch {
        bookings = [];
        myBookingSummary.textContent = 'Could not load bookings. Please ensure backend is running on port 3000.';
        renderTable();
    }
}

bookingSearch?.addEventListener('input', renderTable);
statusFilter?.addEventListener('change', renderTable);

// Cancel booking handler
myBookingBody?.addEventListener('click', (event) => {
    const cancelBtn = event.target.closest('.cancel-btn');
    if (!cancelBtn || cancelBtn.disabled) return;

    const bookingId = cancelBtn.dataset.id;
    if (bookingId) {
        cancelBooking(bookingId, cancelBtn);
    }
});

refreshBtn?.addEventListener('click', () => {
    loadMyBookings();
    showToast('Bookings refreshed.', 'info');
});

logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
});

if (welcomeName) {
    welcomeName.textContent = firstName(currentUser?.name);
}

loadMyBookings();
