/**
 * SNR Travels — Home Page Logic
 * Uses shared.js for: ThemeManager, getLoggedInUser, getFirstName, getInitials,
 *                       API_BASE, Toast, initBackToTop, initContactForm
 */

const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
const tripSearchForm = document.getElementById('tripSearchForm');
const searchResult = document.getElementById('searchResult');
const travelDateInput = document.getElementById('travelDate');
const desktopAuthLink = document.getElementById('desktopAuthLink');
const desktopAuthText = document.getElementById('desktopAuthText');
const desktopAuthBadge = document.getElementById('desktopAuthBadge');
const mobileAuthLink = document.getElementById('mobileAuthLink');

function updateAuthUi() {
    const user = getLoggedInUser();
    if (!desktopAuthText || !mobileAuthLink) {
        return;
    }

    if (!user || !user.name) {
        desktopAuthText.textContent = 'Login';
        mobileAuthLink.textContent = 'Login';
        desktopAuthBadge.textContent = '';
        desktopAuthLink?.classList.remove('logged-in');
        mobileAuthLink.classList.remove('logged-in');
        desktopAuthLink.href = 'login.html';
        mobileAuthLink.href = 'login.html';
        return;
}

    const firstName = getFirstName(user.name);
    const initials = getInitials(user.name);

    desktopAuthText.textContent = `Hi, ${firstName} 👋`;
    if (desktopAuthBadge) {
        desktopAuthBadge.textContent = initials;
    }
    mobileAuthLink.textContent = `${firstName} • My Account`;

    desktopAuthLink?.classList.add('logged-in');
    mobileAuthLink.classList.add('logged-in');

    desktopAuthLink.href = 'user-dashboard.html';
    mobileAuthLink.href = 'user-dashboard.html';
}

updateAuthUi();

function initHomeEffects() {
    const revealElements = document.querySelectorAll('.search-card, .card, .showcase-card, .route-card, .hero-image-strip img');
    revealElements.forEach((element) => element.classList.add('reveal'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    revealElements.forEach((element) => observer.observe(element));

    const heroSection = document.querySelector('.hero');
    const heroImages = document.querySelectorAll('.hero-image-strip img');

    heroSection?.addEventListener('mousemove', (event) => {
        const bounds = heroSection.getBoundingClientRect();
        const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
        const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;

        heroImages.forEach((image, index) => {
            const strength = (index + 1) * 3;
            image.style.transform = `translate(${offsetX * strength}px, ${offsetY * strength}px)`;
        });
    });

    heroSection?.addEventListener('mouseleave', () => {
        heroImages.forEach((image) => {
            image.style.transform = 'translate(0, 0)';
        });
    });
}

initHomeEffects();

if (travelDateInput) {
    const today = new Date().toISOString().split('T')[0];
    travelDateInput.min = today;
    travelDateInput.value = today;
}

if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
        const target = anchor.getAttribute('href');
        if (!target || target === '#') {
            return;
        }

        const element = document.querySelector(target);
        if (!element) {
            return;
        }

        event.preventDefault();
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        navLinks?.classList.remove('open');
    });
});

if (tripSearchForm) {
    tripSearchForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const fromCity = document.getElementById('fromCity').value.trim();
        const toCity = document.getElementById('toCity').value.trim();
        const travelDate = document.getElementById('travelDate').value;

        if (!fromCity || !toCity || !travelDate) {
            searchResult.textContent = 'Please fill all fields before searching.';
            return;
        }

        searchResult.textContent = `Searching buses from ${fromCity} to ${toCity}...`;
        const params = new URLSearchParams({ from: fromCity, to: toCity, date: travelDate });

        setTimeout(() => {
            window.location.href = `results.html?${params.toString()}`;
        }, 500);
    });
}

// Newsletter form
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        const email = emailInput.value.trim();
        if (email) {
            emailInput.value = '';
            const btn = newsletterForm.querySelector('button');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Subscribed!';
            btn.style.background = '#059669';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
            }, 2500);
        }
    });
}
