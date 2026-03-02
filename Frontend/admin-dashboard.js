const currentUser = (() => {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
    }
})();

if (!currentUser || currentUser.role !== 'admin') {
    window.location.href = 'login.html';
}

const state = {
    bookings: [],
    users: [],
    drivers: []
};

// Uses shared API_BASE from shared.js
const API_BASE_URL = (typeof API_BASE !== 'undefined') ? API_BASE : '';

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
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? `₹${amount.toLocaleString('en-IN')}` : '—';
}

function emptyRow(cols, message = 'No records found') {
    return `<tr><td colspan="${cols}"><div class="empty-state"><i class="fa-solid fa-inbox"></i><p>${message}</p></div></td></tr>`;
}

function statusBadge(status) {
    const normalized = String(status || 'pending').toLowerCase();
    return `<span class="badge ${esc(normalized)}">${normalized.toUpperCase()}</span>`;
}

// Delegate to shared Toast system (shared.js) with fallback
function toast(message, type = 'info') {
    if (typeof Toast !== 'undefined' && Toast.show) {
        Toast.show(message, type);
    } else {
        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${esc(message)}</span>`;
        document.getElementById('toastContainer').appendChild(el);
        setTimeout(() => {
            el.classList.add('out');
            el.addEventListener('animationend', () => el.remove());
        }, 3000);
    }
}

const sectionMeta = {
    dashboard: ['Dashboard', 'Live booking operations with payment received and status tracking'],
    bookings: ['Bookings', 'Search, filter, and update booking statuses'],
    users: ['Users', 'Registered customer accounts'],
    drivers: ['Drivers', 'Driver roster and availability status']
};

function setSection(name) {
    document.querySelectorAll('.section').forEach((section) => {
        section.classList.toggle('active', section.id === `${name}-section`);
    });

    document.querySelectorAll('.menu-item').forEach((button) => {
        button.classList.toggle('active', button.dataset.section === name);
    });

    const [title, subtitle] = sectionMeta[name] || sectionMeta.dashboard;
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('pageSubtitle').textContent = subtitle;
}

function renderKPIs() {
    const bookings = state.bookings;
    const total = bookings.length;
    const pending = bookings.filter((item) => String(item.status || '').toLowerCase() === 'pending').length;
    const confirmed = bookings.filter((item) => String(item.status || '').toLowerCase() === 'confirmed').length;
    const completed = bookings.filter((item) => String(item.status || '').toLowerCase() === 'completed').length;
    const paidBookings = bookings.filter((item) => String(item.payment_status || '').toLowerCase() === 'paid').length;

    const paymentReceived = bookings.reduce((sum, item) => {
        return String(item.payment_status || '').toLowerCase() === 'paid' ? sum + (Number(item.fare) || 0) : sum;
    }, 0);

    const totalRevenue = bookings.reduce((sum, item) => sum + (Number(item.fare) || 0), 0);

    document.getElementById('kpiTotal').textContent = String(total);
    document.getElementById('kpiPending').textContent = String(pending);
    document.getElementById('kpiConfirmed').textContent = String(confirmed);
    document.getElementById('kpiCompleted').textContent = String(completed);
    document.getElementById('kpiPaid').textContent = String(paidBookings);
    document.getElementById('kpiPaymentReceived').textContent = `₹${paymentReceived.toLocaleString('en-IN')}`;
    document.getElementById('kpiRevenue').textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
}

function renderTrend() {
    const canvas = document.getElementById('trendCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
    });

    const data = days.map((date) => {
        const key = date.toISOString().slice(0, 10);
        return state.bookings.filter((booking) => {
            if (!booking.booking_date) return false;
            return new Date(booking.booking_date).toISOString().slice(0, 10) === key;
        }).length;
    });

    const max = Math.max(...data, 1);
    const padL = 40;
    const padR = 16;
    const padT = 20;
    const padB = 30;
    const cW = W - padL - padR;
    const cH = H - padT - padB;
    const stepX = cW / (data.length - 1 || 1);

    ctx.strokeStyle = 'rgba(177,195,255,0.15)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i += 1) {
        const y = padT + (i * cH / 4);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(160,180,255,0.5)';
        ctx.font = '10px Inter';
        ctx.fillText(String(Math.round(max - (i * max / 4))), 4, y + 4);
    }

    const points = data.map((value, index) => ({
        x: padL + index * stepX,
        y: padT + cH - (value / max) * cH,
        value,
        date: days[index]
    }));

    const grad = ctx.createLinearGradient(0, padT, 0, H - padB);
    grad.addColorStop(0, 'rgba(92,123,255,0.35)');
    grad.addColorStop(1, 'rgba(92,123,255,0.02)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.lineTo(points[points.length - 1].x, H - padB);
    ctx.lineTo(points[0].x, H - padB);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    const lineGrad = ctx.createLinearGradient(padL, 0, W - padR, 0);
    lineGrad.addColorStop(0, '#5f7cff');
    lineGrad.addColorStop(1, '#9a63ff');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(108,132,255,0.4)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    points.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#7f9aff';
        ctx.fill();

        ctx.fillStyle = '#b8c7f5';
        ctx.font = '10px Inter';
        ctx.fillText(String(point.value), point.x - 3, point.y - 8);
        ctx.fillText(point.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), point.x - 14, H - padB + 14);
    });
}

function renderActivity() {
    const feed = document.getElementById('activityFeed');
    const items = state.bookings.slice(0, 8).map((booking) => `
        <li class="activity-item">
            <strong>#${esc(booking.id)}</strong> — ${esc(booking.customer_name || 'Unknown')}
            <div>${esc(booking.pickup_location || '-')} → ${esc(booking.dropoff_location || '-')}</div>
            <div class="activity-meta">${esc(String(booking.status || 'pending').toUpperCase())} • ${fmtDate(booking.booking_date)}</div>
        </li>
    `);

    feed.innerHTML = items.length ? items.join('') : '<li class="activity-item">No activity yet.</li>';
}

function renderRecentBookings() {
    const rows = state.bookings.slice(0, 6).map((booking) => `
        <tr>
            <td>#${esc(booking.id)}</td>
            <td>${esc(booking.customer_name || '—')}</td>
            <td>${esc(booking.pickup_location || '—')} → ${esc(booking.dropoff_location || '—')}</td>
            <td>${fmtDate(booking.booking_date)}</td>
            <td>
                <div style="font-weight:600;font-size:0.82rem">${esc(String(booking.payment_method || 'CASH').toUpperCase())}</div>
                <div style="color:var(--muted);font-size:0.78rem">${esc(String(booking.payment_status || 'pending').toUpperCase())}</div>
            </td>
            <td>${statusBadge(booking.status)}</td>
        </tr>
    `);

    document.getElementById('recentBody').innerHTML = rows.length ? rows.join('') : emptyRow(6, 'No bookings yet');
    document.getElementById('lastUpdated').textContent = `Updated: ${new Date().toLocaleTimeString('en-IN')}`;
}

function getFilteredBookings() {
    const search = (document.getElementById('bookingSearch')?.value || '').trim().toLowerCase();
    const status = document.getElementById('statusFilter')?.value || 'all';
    const payment = document.getElementById('paymentFilter')?.value || 'all';

    return state.bookings.filter((booking) => {
        const matchesSearch = !search
            || String(booking.id).includes(search)
            || String(booking.customer_name || '').toLowerCase().includes(search)
            || String(booking.pickup_location || '').toLowerCase().includes(search)
            || String(booking.dropoff_location || '').toLowerCase().includes(search);

        const matchesStatus = status === 'all' || String(booking.status || '').toLowerCase() === status;
        const matchesPayment = payment === 'all' || String(booking.payment_status || '').toLowerCase() === payment;

        return matchesSearch && matchesStatus && matchesPayment;
    });
}

function renderBookingsTable() {
    const filtered = getFilteredBookings();
    const paymentReceived = filtered.reduce((sum, booking) => {
        return String(booking.payment_status || '').toLowerCase() === 'paid' ? sum + (Number(booking.fare) || 0) : sum;
    }, 0);

    document.getElementById('bookingStats').innerHTML = `
        Showing <strong>${filtered.length}</strong> of <strong>${state.bookings.length}</strong> bookings &nbsp;|&nbsp;
        Payment Received Amount: <strong>₹${paymentReceived.toLocaleString('en-IN')}</strong>
    `;

    const rows = filtered.map((booking) => `
        <tr>
            <td>#${esc(booking.id)}</td>
            <td>
                <div style="font-weight:600">${esc(booking.customer_name || '—')}</div>
                <div style="color:var(--muted);font-size:0.78rem">${esc(booking.customer_email || '')}</div>
            </td>
            <td>${esc(booking.pickup_location || '—')} → ${esc(booking.dropoff_location || '—')}</td>
            <td>${fmtDate(booking.booking_date)}</td>
            <td>${esc(booking.passengers || 1)}</td>
            <td>${fmtCurrency(booking.fare)}</td>
            <td>
                <div style="font-weight:600;font-size:0.82rem">${esc(String(booking.payment_method || 'CASH').toUpperCase())}</div>
                <div style="color:var(--muted);font-size:0.78rem">${esc(String(booking.payment_status || 'pending').toUpperCase())}</div>
            </td>
            <td>${statusBadge(booking.status)}</td>
            <td>
                <div class="row-actions">
                    <button class="mini-btn confirm" data-id="${esc(booking.id)}" data-status="confirmed" type="button">Confirm</button>
                    <button class="mini-btn complete" data-id="${esc(booking.id)}" data-status="completed" type="button">Complete</button>
                    <button class="mini-btn cancel" data-id="${esc(booking.id)}" data-status="cancelled" type="button">Cancel</button>
                </div>
            </td>
        </tr>
    `);

    document.getElementById('bookingsBody').innerHTML = rows.length ? rows.join('') : emptyRow(9);
}

function renderUsers() {
    const search = (document.getElementById('userSearch')?.value || '').trim().toLowerCase();
    const role = document.getElementById('userRoleFilter')?.value || 'all';

    const filtered = state.users.filter((user) => {
        const matchesSearch = !search
            || String(user.name || '').toLowerCase().includes(search)
            || String(user.email || '').toLowerCase().includes(search);
        const matchesRole = role === 'all' || String(user.role || 'user').toLowerCase() === role;
        return matchesSearch && matchesRole;
    });

    const rows = filtered.map((user) => `
        <tr>
            <td>#${esc(user.id)}</td>
            <td style="font-weight:600">${esc(user.name || '—')}</td>
            <td>${esc(user.email || '—')}</td>
            <td>${esc(user.phone || '—')}</td>
            <td><span class="badge ${esc(String(user.role || 'user').toLowerCase())}">${esc(String(user.role || 'user').toUpperCase())}</span></td>
            <td>${fmtDate(user.created_at)}</td>
        </tr>
    `);

    document.getElementById('usersBody').innerHTML = rows.length ? rows.join('') : emptyRow(6, 'No users found');
}

function renderDrivers() {
    const search = (document.getElementById('driverSearch')?.value || '').trim().toLowerCase();
    const availability = document.getElementById('driverAvailFilter')?.value || 'all';

    const filtered = state.drivers.filter((driver) => {
        const matchesSearch = !search
            || String(driver.name || '').toLowerCase().includes(search)
            || String(driver.license_number || '').toLowerCase().includes(search);

        const availStatus = driver.is_available ? 'available' : 'unavailable';
        const matchesAvailability = availability === 'all' || availStatus === availability;

        return matchesSearch && matchesAvailability;
    });

    const rows = filtered.map((driver) => {
        const availStatus = driver.is_available ? 'available' : 'unavailable';
        const rating = Number(driver.rating);
        const stars = Number.isFinite(rating) ? `⭐ ${rating.toFixed(1)}` : '—';

        return `
            <tr>
                <td>#${esc(driver.id)}</td>
                <td style="font-weight:600">${esc(driver.name || '—')}</td>
                <td>${esc(driver.phone || '—')}</td>
                <td><code style="font-size:0.82rem;opacity:0.85">${esc(driver.license_number || '—')}</code></td>
                <td>${stars}</td>
                <td><span class="badge ${availStatus}">${availStatus.toUpperCase()}</span></td>
            </tr>
        `;
    });

    document.getElementById('driversBody').innerHTML = rows.length ? rows.join('') : emptyRow(6, 'No drivers found');
}

async function updateBookingStatus(id, status, button) {
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner spinner"></i>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            throw new Error('Failed');
        }

        state.bookings = state.bookings.map((booking) => {
            return Number(booking.id) === Number(id) ? { ...booking, status } : booking;
        });

        renderAll();
        toast(`Booking #${id} marked as ${status}.`, 'success');
    } catch {
        toast('Could not update booking status. Please try again.', 'error');
        button.disabled = false;
        button.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }
}

function renderAll() {
    renderKPIs();
    renderTrend();
    renderActivity();
    renderRecentBookings();
    renderBookingsTable();
    renderUsers();
    renderDrivers();
}

async function loadData() {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.innerHTML = '<i class="fa-solid fa-spinner spinner"></i> Loading';
    refreshBtn.disabled = true;

    try {
        const [bookingsRes, usersRes, driversRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/bookings`).catch(() => null),
            fetch(`${API_BASE_URL}/api/users`).catch(() => null),
            fetch(`${API_BASE_URL}/api/drivers`).catch(() => null)
        ]);

        state.bookings = bookingsRes?.ok ? await bookingsRes.json().catch(() => []) : [];
        state.users = usersRes?.ok ? await usersRes.json().catch(() => []) : [];
        state.drivers = driversRes?.ok ? await driversRes.json().catch(() => []) : [];

        if (!Array.isArray(state.bookings)) state.bookings = [];
        if (!Array.isArray(state.users)) state.users = [];
        if (!Array.isArray(state.drivers)) state.drivers = [];

        renderAll();
        toast('Data refreshed successfully.', 'success');
    } catch {
        toast('Failed to load data. Is the server running?', 'error');
    } finally {
        refreshBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Refresh';
        refreshBtn.disabled = false;
    }
}

function initTilt() {
    document.querySelectorAll('.kpi, .panel').forEach((el) => {
        el.addEventListener('mousemove', (event) => {
            const rect = el.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            el.style.transform = `perspective(800px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg) translateY(-2px)`;
        });

        el.addEventListener('mouseleave', () => {
            el.style.transform = '';
        });
    });
}

function bindEvents() {
    document.querySelectorAll('.menu-item').forEach((button) => {
        button.addEventListener('click', () => setSection(button.dataset.section || 'dashboard'));
    });

    document.getElementById('refreshBtn').addEventListener('click', loadData);

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    document.getElementById('bookingsBody').addEventListener('click', (event) => {
        const button = event.target.closest('.mini-btn');
        if (!button || button.disabled) return;

        const { id, status } = button.dataset;
        if (id && status) {
            updateBookingStatus(id, status, button);
        }
    });

    ['bookingSearch', 'statusFilter', 'paymentFilter'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', renderBookingsTable);
        document.getElementById(id)?.addEventListener('change', renderBookingsTable);
    });

    ['userSearch', 'userRoleFilter'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', renderUsers);
        document.getElementById(id)?.addEventListener('change', renderUsers);
    });

    ['driverSearch', 'driverAvailFilter'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', renderDrivers);
        document.getElementById(id)?.addEventListener('change', renderDrivers);
    });
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');
    const closeBtn = document.getElementById('sidebarClose');

    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (hamburger) hamburger.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Close sidebar on nav click (mobile)
    document.querySelectorAll('.menu-item').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 980) closeSidebar();
        });
    });
}

function initDashboard() {
    const adminName = document.getElementById('adminName');
    const welcomeName = document.getElementById('welcomeName');
    const adminInitials = document.getElementById('adminInitials');

    if (currentUser?.name) {
        if (adminName) adminName.textContent = currentUser.name;
        if (welcomeName) welcomeName.textContent = currentUser.name.split(' ')[0];
        if (adminInitials) {
            const parts = currentUser.name.trim().split(/\s+/);
            adminInitials.textContent = parts.length > 1
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                : parts[0].slice(0, 2).toUpperCase();
        }
    }

    initSidebar();
    bindEvents();
    initTilt();
    loadData();
}

initDashboard();
