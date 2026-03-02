/**
 * SNR Travels — Results Page Logic
 * Uses shared.js for: getLoggedInUser, getFirstName, getInitials, API_BASE, Toast
 */

const busResults = document.getElementById('busResults');
const routeTitle = document.getElementById('routeTitle');
const routeSubtitle = document.getElementById('routeSubtitle');
const toolbarText = document.getElementById('toolbarText');
const resultCount = document.getElementById('resultCount');
const maxPrice = document.getElementById('maxPrice');
const maxPriceLabel = document.getElementById('maxPriceLabel');
const sortBy = document.getElementById('sortBy');
const clearFilters = document.getElementById('clearFilters');

const topSearchForm = document.getElementById('topSearchForm');
const topFrom = document.getElementById('topFrom');
const topTo = document.getElementById('topTo');
const topDate = document.getElementById('topDate');
const resultsAuthLink = document.getElementById('resultsAuthLink');
const bookingModal = document.getElementById('bookingModal');
const closeBookingModal = document.getElementById('closeBookingModal');
const bookingRouteText = document.getElementById('bookingRouteText');
const bookingBusName = document.getElementById('bookingBusName');
const bookingTimeText = document.getElementById('bookingTimeText');
const passengerCountInput = document.getElementById('passengerCount');
const contactNumberInput = document.getElementById('contactNumber');
const bookingAmount = document.getElementById('bookingAmount');
const confirmBookingBtn = document.getElementById('confirmBookingBtn');

let activeBookingBus = null;
let selectedPaymentMethod = 'GPAY';

const busData = [
    { id: 1, name: 'SNR Premium Sleeper', type: ['sleeper', 'ac'], from: 'Chennai', to: 'Bengaluru', departure: '22:30', arrival: '05:20', duration: '6h 50m', rating: 4.8, price: 799, seatsLeft: 11 },
    { id: 2, name: 'SNR Volvo Multi-Axle', type: ['seater', 'ac'], from: 'Chennai', to: 'Bengaluru', departure: '20:15', arrival: '03:30', duration: '7h 15m', rating: 4.6, price: 699, seatsLeft: 7 },
    { id: 3, name: 'SNR Night Express', type: ['sleeper'], from: 'Hyderabad', to: 'Vijayawada', departure: '21:45', arrival: '03:20', duration: '5h 35m', rating: 4.7, price: 649, seatsLeft: 14 },
    { id: 4, name: 'SNR Fastliner AC', type: ['seater', 'ac'], from: 'Mumbai', to: 'Pune', departure: '18:40', arrival: '22:10', duration: '3h 30m', rating: 4.5, price: 549, seatsLeft: 18 },
    { id: 5, name: 'SNR Morning Coach', type: ['seater'], from: 'Delhi', to: 'Jaipur', departure: '08:00', arrival: '13:10', duration: '5h 10m', rating: 4.4, price: 599, seatsLeft: 20 },
    { id: 6, name: 'SNR Royal Sleeper', type: ['sleeper', 'ac'], from: 'Kochi', to: 'Trivandrum', departure: '23:15', arrival: '04:00', duration: '4h 45m', rating: 4.9, price: 729, seatsLeft: 6 },
    { id: 7, name: 'SNR City Connector', type: ['seater'], from: 'Bengaluru', to: 'Mysuru', departure: '14:30', arrival: '17:45', duration: '3h 15m', rating: 4.3, price: 399, seatsLeft: 22 },
    { id: 8, name: 'SNR Comfort AC', type: ['ac', 'seater'], from: 'Hyderabad', to: 'Vijayawada', departure: '11:50', arrival: '17:05', duration: '5h 15m', rating: 4.6, price: 579, seatsLeft: 9 },
    { id: 9, name: 'SNR Express Deluxe', type: ['seater', 'ac'], from: 'Chennai', to: 'Bengaluru', departure: '06:00', arrival: '12:30', duration: '6h 30m', rating: 4.5, price: 649, seatsLeft: 15 },
    { id: 10, name: 'SNR Night Rider', type: ['sleeper'], from: 'Mumbai', to: 'Pune', departure: '23:00', arrival: '02:30', duration: '3h 30m', rating: 4.7, price: 499, seatsLeft: 8 },
    { id: 11, name: 'SNR Rajdhani Express', type: ['sleeper', 'ac'], from: 'Delhi', to: 'Jaipur', departure: '21:00', arrival: '02:15', duration: '5h 15m', rating: 4.8, price: 749, seatsLeft: 5 },
    { id: 12, name: 'SNR Budget Liner', type: ['seater'], from: 'Hyderabad', to: 'Vijayawada', departure: '07:30', arrival: '12:45', duration: '5h 15m', rating: 4.2, price: 449, seatsLeft: 25 }
];

function getApiBaseUrlLocal() {
    // Use shared API_BASE from shared.js
    return typeof API_BASE !== 'undefined' ? API_BASE : '';
}

const API_BASE_URL = getApiBaseUrlLocal();

// Toast: use shared Toast.show if available, fallback to local
function showToast(message, type = 'info') {
    if (typeof Toast !== 'undefined' && Toast.show) {
        Toast.show(message, type);
        return;
    }
    console.log(`[${type}] ${message}`);
}

function parseQuery() {
    const params = new URLSearchParams(window.location.search);
    const from = (params.get('from') || '').trim();
    const to = (params.get('to') || '').trim();
    const date = params.get('date') || new Date().toISOString().split('T')[0];
    return { from, to, date };
}

function updateTopSearch({ from, to, date }) {
    topFrom.value = from;
    topTo.value = to;
    topDate.value = date;
    topDate.min = new Date().toISOString().split('T')[0];
}

function getTimeBucket(timeString) {
    const hour = Number(timeString.split(':')[0]);
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'night';
}

function filterAndSortBuses() {
    const selectedTypes = [...document.querySelectorAll('.filter-type:checked')].map((el) => el.value);
    const selectedTime = document.querySelector('input[name="time"]:checked').value;
    const maxPriceValue = Number(maxPrice.value);

    let filtered = busData.filter((bus) => {
        const typeMatch = selectedTypes.length === 0 || selectedTypes.every((type) => bus.type.includes(type));
        const timeMatch = selectedTime === 'all' || getTimeBucket(bus.departure) === selectedTime;
        const priceMatch = bus.price <= maxPriceValue;
        return typeMatch && timeMatch && priceMatch;
    });

    const query = parseQuery();
    if (query.from && query.to) {
        filtered = filtered.filter((bus) => bus.from.toLowerCase() === query.from.toLowerCase() && bus.to.toLowerCase() === query.to.toLowerCase());
    }

    const sortValue = sortBy.value;
    if (sortValue === 'priceLow') filtered.sort((a, b) => a.price - b.price);
    if (sortValue === 'priceHigh') filtered.sort((a, b) => b.price - a.price);
    if (sortValue === 'rating') filtered.sort((a, b) => b.rating - a.rating);
    if (sortValue === 'departure') filtered.sort((a, b) => a.departure.localeCompare(b.departure));
    if (sortValue === 'recommended') filtered.sort((a, b) => (b.rating * 100 - b.price / 2) - (a.rating * 100 - a.price / 2));

    return filtered;
}

function renderResults() {
    const query = parseQuery();
    const dateLabel = query.date ? new Date(query.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

    if (query.from && query.to) {
        routeTitle.textContent = `${query.from} to ${query.to}`;
        routeSubtitle.textContent = `Showing departures for ${dateLabel}.`;
    }

    maxPriceLabel.textContent = maxPrice.value;

    const results = filterAndSortBuses();
    resultCount.textContent = String(results.length);
    toolbarText.textContent = `${results.length} bus${results.length !== 1 ? 'es' : ''} found`;

    if (results.length === 0) {
        busResults.innerHTML = `
            <div class="empty">
                <i class="fa-solid fa-bus" style="font-size:2rem;opacity:0.4;margin-bottom:10px;display:block"></i>
                <p>No buses match your filters. Try adjusting your search criteria.</p>
            </div>`;
        return;
    }

    busResults.innerHTML = results.map((bus) => `
        <article class="bus-card">
            <div class="bus-title">
                <h3>${bus.name}</h3>
                <p><i class="fa-solid fa-route" style="color:#5d66dc"></i> ${bus.from} → ${bus.to}</p>
                <p><i class="fa-regular fa-clock" style="color:#5d66dc"></i> ${bus.departure} - ${bus.arrival} • ${bus.duration}</p>
                <div class="bus-tags">
                    ${bus.type.map((type) => `<span>${type.toUpperCase()}</span>`).join('')}
                    <span class="${bus.seatsLeft <= 5 ? 'seats-low' : ''}">${bus.seatsLeft} Seats Left</span>
                </div>
            </div>
            <div class="bus-right">
                <div class="rating"><i class="fa-solid fa-star"></i> ${bus.rating}</div>
                <div class="price">₹${bus.price}<small>/seat</small></div>
                <a class="seat-btn" data-bus-id="${bus.id}" href="#">
                    <i class="fa-solid fa-ticket"></i> Book Now
                </a>
            </div>
        </article>
    `).join('');
}

function updateQueryFromTopSearch(event) {
    event.preventDefault();
    const from = topFrom.value.trim();
    const to = topTo.value.trim();
    const date = topDate.value;

    if (!from || !to || !date) {
        showToast('Please fill all search fields.', 'error');
        return;
    }

    const params = new URLSearchParams({ from, to, date });
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    renderResults();
    showToast(`Showing buses from ${from} to ${to}`, 'info');
}

function getLoggedInUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch (error) {
        return null;
    }
}

function getFirstName(fullName) {
    if (!fullName) return '';
    return fullName.trim().split(/\s+/)[0] || '';
}

function getInitials(fullName) {
    if (!fullName) return 'U';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

function updateAuthUi() {
    const user = getLoggedInUser();
    if (!resultsAuthLink) {
        return;
    }

    if (user && user.name) {
        const firstName = getFirstName(user.name);
        const initials = getInitials(user.name);
        resultsAuthLink.classList.add('logged-in');
        resultsAuthLink.href = 'user-dashboard.html';
        resultsAuthLink.innerHTML = '';

        const initialNode = document.createElement('span');
        initialNode.className = 'auth-initial';
        initialNode.textContent = initials;

        const labelNode = document.createElement('span');
        labelNode.textContent = `Hi, ${firstName}`;

        resultsAuthLink.append(initialNode, labelNode);
    } else {
        resultsAuthLink.classList.remove('logged-in');
        resultsAuthLink.href = 'login.html';
        resultsAuthLink.textContent = 'Login';
    }
}

function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    document.querySelectorAll('.pay-option').forEach((el) => {
        el.classList.toggle('active', el.dataset.method === method);
    });

    const gpayFields = document.getElementById('gpayFields');
    const cardFields = document.getElementById('cardFields');
    const netbankFields = document.getElementById('netbankFields');
    const cashFields = document.getElementById('cashFields');

    if (gpayFields) gpayFields.style.display = method === 'GPAY' ? 'block' : 'none';
    if (cardFields) cardFields.style.display = method === 'CARD' ? 'block' : 'none';
    if (netbankFields) netbankFields.style.display = method === 'NETBANKING' ? 'block' : 'none';
    if (cashFields) cashFields.style.display = method === 'CASH' ? 'block' : 'none';

    const btnTexts = {
        GPAY: '<i class="fa-solid fa-bolt"></i> Pay with GPay & Confirm',
        CARD: '<i class="fa-solid fa-credit-card"></i> Pay with Card & Confirm',
        NETBANKING: '<i class="fa-solid fa-building-columns"></i> Pay via Net Banking & Confirm',
        CASH: '<i class="fa-solid fa-money-bill-wave"></i> Confirm Booking (Pay Later)'
    };
    if (confirmBookingBtn) confirmBookingBtn.innerHTML = btnTexts[method] || btnTexts.GPAY;
}

function openBookingModal(bus) {
    const user = getLoggedInUser();
    if (!user) {
        window.location.href = `login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
    }
    if (user.role !== 'user') {
        showToast('Please login with a user account to book tickets.', 'error');
        return;
    }

    activeBookingBus = bus;
    const query = parseQuery();
    const pickup = query.from || bus.from;
    const dropoff = query.to || bus.to;

    bookingRouteText.textContent = `${pickup} → ${dropoff}`;
    bookingBusName.textContent = bus.name;
    bookingTimeText.textContent = `${bus.departure} - ${bus.arrival} • ${bus.duration}`;
    passengerCountInput.value = '1';
    contactNumberInput.value = '';
    bookingAmount.textContent = `₹${bus.price}`;

    const gpayUpiId = document.getElementById('gpayUpiId');
    const cardNumber = document.getElementById('cardNumber');
    const cardExpiry = document.getElementById('cardExpiry');
    const cardCvv = document.getElementById('cardCvv');
    const bankName = document.getElementById('bankName');

    if (gpayUpiId) gpayUpiId.value = '';
    if (cardNumber) cardNumber.value = '';
    if (cardExpiry) cardExpiry.value = '';
    if (cardCvv) cardCvv.value = '';
    if (bankName) bankName.value = 'sbi';

    selectedPaymentMethod = 'GPAY';
    selectPaymentMethod('GPAY');

    bookingModal.classList.remove('hidden');
    bookingModal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
    bookingModal.classList.add('hidden');
    bookingModal.setAttribute('aria-hidden', 'true');
    activeBookingBus = null;
}

function validatePaymentFields() {
    const phone = contactNumberInput.value.trim();
    if (!phone || phone.length < 10 || !/^\d{10,}$/.test(phone)) {
        showToast('Please enter a valid 10-digit contact number.', 'error');
        return false;
    }

    if (selectedPaymentMethod === 'GPAY') {
        const upiId = document.getElementById('gpayUpiId').value.trim();
        if (!upiId || !upiId.includes('@')) {
            showToast('Please enter a valid UPI ID (e.g. name@okaxis).', 'error');
            return false;
        }
    }

    if (selectedPaymentMethod === 'CARD') {
        const cardNum = document.getElementById('cardNumber').value.replace(/\s/g, '');
        const expiry = document.getElementById('cardExpiry').value.trim();
        const cvv = document.getElementById('cardCvv').value.trim();

        if (!cardNum || cardNum.length < 13 || !/^\d+$/.test(cardNum)) {
            showToast('Please enter a valid card number.', 'error');
            return false;
        }
        if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry)) {
            showToast('Please enter a valid expiry date (MM/YY).', 'error');
            return false;
        }
        if (!cvv || cvv.length < 3 || !/^\d+$/.test(cvv)) {
            showToast('Please enter a valid CVV.', 'error');
            return false;
        }
    }

    if (selectedPaymentMethod === 'NETBANKING') {
        const bankNameVal = document.getElementById('bankName').value;
        if (!bankNameVal) {
            showToast('Please select a bank.', 'error');
            return false;
        }
    }

    return true;
}

async function createBooking(bus, bookingPayload) {
    const user = getLoggedInUser();
    if (!user) {
        window.location.href = `login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
    }

    if (user.role !== 'user') {
        showToast('Please login with a user account to book tickets.', 'error');
        return;
    }

    const query = parseQuery();
    const bookingDate = query.date || new Date().toISOString().split('T')[0];

    try {
        const response = await fetch(`${API_BASE_URL}/api/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                user_name: user.name,
                user_email: user.email,
                pickup_location: query.from || bus.from,
                dropoff_location: query.to || bus.to,
                booking_date: bookingDate,
                ...bookingPayload
            })
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            showToast(result.error || 'Booking failed. Please try again.', 'error');
            return;
        }

        showToast('Booking confirmed successfully! Check your dashboard for details.', 'success');
        closeModal();
    } catch (error) {
        showToast('Could not connect to server. Please ensure backend is running on port 3000.', 'error');
    }
}

maxPrice.addEventListener('input', renderResults);
sortBy.addEventListener('change', renderResults);
clearFilters.addEventListener('click', () => {
    document.querySelectorAll('.filter-type').forEach((el) => {
        el.checked = false;
    });
    document.querySelector('input[name="time"][value="all"]').checked = true;
    maxPrice.value = '1500';
    sortBy.value = 'recommended';
    renderResults();
    showToast('Filters reset.', 'info');
});

document.querySelectorAll('.filter-type, input[name="time"]').forEach((el) => {
    el.addEventListener('change', renderResults);
});

topSearchForm.addEventListener('submit', updateQueryFromTopSearch);

busResults.addEventListener('click', async (event) => {
    const bookingButton = event.target.closest('.seat-btn');
    if (!bookingButton) {
        return;
    }

    event.preventDefault();
    const busId = Number(bookingButton.getAttribute('data-bus-id'));
    const bus = busData.find((item) => item.id === busId);

    if (!bus) {
        showToast('Selected bus not found.', 'error');
        return;
    }

    openBookingModal(bus);
});

closeBookingModal?.addEventListener('click', closeModal);

bookingModal?.addEventListener('click', (event) => {
    if (event.target === bookingModal) {
        closeModal();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !bookingModal.classList.contains('hidden')) {
        closeModal();
    }
});

// Payment method selection
document.addEventListener('click', (event) => {
    const payOption = event.target.closest('.pay-option');
    if (payOption) {
        selectPaymentMethod(payOption.dataset.method);
    }
});

passengerCountInput?.addEventListener('input', () => {
    if (!activeBookingBus) {
        return;
    }

    const passengers = Math.max(1, Math.min(6, Number(passengerCountInput.value) || 1));
    passengerCountInput.value = String(passengers);
    bookingAmount.textContent = `₹${(activeBookingBus.price * passengers).toLocaleString('en-IN')}`;
});

confirmBookingBtn?.addEventListener('click', async () => {
    if (!activeBookingBus) {
        return;
    }

    if (!validatePaymentFields()) {
        return;
    }

    const passengers = Math.max(1, Math.min(6, Number(passengerCountInput.value) || 1));
    const phone = contactNumberInput.value.trim();

    const paymentStatus = selectedPaymentMethod === 'CASH' ? 'pending' : 'paid';
    const transactionRef = selectedPaymentMethod === 'CASH' ? null : `${selectedPaymentMethod}-${Date.now()}`;

    confirmBookingBtn.disabled = true;
    confirmBookingBtn.innerHTML = '<i class="fa-solid fa-spinner" style="animation:spin 0.8s linear infinite"></i> Processing…';
    if (!document.getElementById('spinStyle')) {
        const s = document.createElement('style');
        s.id = 'spinStyle';
        s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(s);
    }

    await createBooking(activeBookingBus, {
        passengers,
        payment_method: selectedPaymentMethod,
        payment_status: paymentStatus,
        transaction_ref: transactionRef,
        fare: activeBookingBus.price * passengers,
        contact_number: phone
    });

    confirmBookingBtn.disabled = false;
    const btnTexts = {
        GPAY: '<i class="fa-solid fa-bolt"></i> Pay with GPay & Confirm',
        CARD: '<i class="fa-solid fa-credit-card"></i> Pay with Card & Confirm',
        NETBANKING: '<i class="fa-solid fa-building-columns"></i> Pay via Net Banking & Confirm',
        CASH: '<i class="fa-solid fa-money-bill-wave"></i> Confirm Booking (Pay Later)'
    };
    confirmBookingBtn.innerHTML = btnTexts[selectedPaymentMethod] || btnTexts.GPAY;
});

const initialQuery = parseQuery();
updateTopSearch(initialQuery);
updateAuthUi();
renderResults();
