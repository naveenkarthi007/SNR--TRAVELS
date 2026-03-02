/**
 * SNR Travels — Shared Utilities
 * Dark mode, auth helpers, toast system, back-to-top, and common functions.
 * Include this BEFORE page-specific JS on every page.
 */

/* ============================================================================
   DARK MODE
   ============================================================================ */
const ThemeManager = (() => {
    const STORAGE_KEY = 'snr-theme';

    function get() {
        return localStorage.getItem(STORAGE_KEY) || 'light';
    }

    function apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }

    function toggle() {
        const next = get() === 'dark' ? 'light' : 'dark';
        apply(next);
        return next;
    }

    function init() {
        // Respect saved preference or OS preference
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            apply(saved);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            apply('dark');
        }

        // Listen for OS changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(STORAGE_KEY)) {
                apply(e.matches ? 'dark' : 'light');
            }
        });

        // Bind all toggle buttons
        document.querySelectorAll('.theme-toggle').forEach((btn) => {
            btn.addEventListener('click', () => toggle());
        });
    }

    return { get, apply, toggle, init };
})();

/* ============================================================================
   AUTH HELPERS (DRY — used across all pages)
   ============================================================================ */
function getLoggedInUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch {
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

function getApiBaseUrl() {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isFileProtocol = window.location.protocol === 'file:';
    const isDifferentLocalPort = isLocalhost && window.location.port && window.location.port !== '3000';
    if (isFileProtocol || isDifferentLocalPort) {
        return 'http://localhost:3000';
    }
    return '';
}

const API_BASE = getApiBaseUrl();

/* ============================================================================
   TOAST NOTIFICATION SYSTEM (unified across pages)
   ============================================================================ */
const Toast = (() => {
    let container = null;

    function getContainer() {
        if (container) return container;
        container = document.createElement('div');
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
        return container;
    }

    function show(message, type = 'info', duration = 3500) {
        const colors = { success: '#059669', error: '#dc2626', info: '#2563eb' };
        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };

        const el = document.createElement('div');
        el.setAttribute('role', 'status');
        el.style.cssText = `
            display:flex;align-items:center;gap:10px;
            background:var(--card-bg,#fff);color:var(--text,#1e2740);
            border:1px solid var(--border,#d8e1ff);
            border-left:4px solid ${colors[type] || colors.info};
            border-radius:12px;padding:12px 16px;
            font-size:0.88rem;font-weight:600;
            box-shadow:var(--shadow-md, 0 10px 28px rgba(60,80,160,0.18));
            max-width:360px;
            animation:toastSlideIn 0.25s ease;
        `;

        const safeMessage = message.replace(/</g, '&lt;');
        el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}" style="color:${colors[type]};font-size:1rem"></i><span>${safeMessage}</span>`;

        // Inject animation keyframes once
        if (!document.getElementById('snr-toast-style')) {
            const s = document.createElement('style');
            s.id = 'snr-toast-style';
            s.textContent = `
                @keyframes toastSlideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
                @keyframes toastSlideOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(20px)}}
            `;
            document.head.appendChild(s);
        }

        getContainer().appendChild(el);

        setTimeout(() => {
            el.style.animation = 'toastSlideOut 0.3s ease forwards';
            el.addEventListener('animationend', () => el.remove());
        }, duration);
    }

    return { show };
})();

/* ============================================================================
   BACK TO TOP BUTTON
   ============================================================================ */
function initBackToTop() {
    const btn = document.querySelector('.back-to-top');
    if (!btn) return;

    const toggleVisibility = () => {
        btn.classList.toggle('visible', window.scrollY > 400);
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/* ============================================================================
   CONTACT FORM VALIDATION
   ============================================================================ */
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const validators = {
        contactName: (val) => val.length >= 2 ? '' : 'Name must be at least 2 characters.',
        contactEmail: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? '' : 'Please enter a valid email address.',
        contactPhone: (val) => !val || /^\d{10,15}$/.test(val.replace(/[\s\-\+]/g, '')) ? '' : 'Please enter a valid phone number.',
        contactSubject: (val) => val.length >= 3 ? '' : 'Subject must be at least 3 characters.',
        contactMessage: (val) => val.length >= 10 ? '' : 'Message must be at least 10 characters.'
    };

    function validateField(input) {
        const validate = validators[input.id];
        if (!validate) return true;

        const error = validate(input.value.trim());
        const errorEl = input.parentElement.querySelector('.field-error');

        if (error) {
            input.classList.add('invalid');
            input.classList.remove('valid');
            if (errorEl) errorEl.textContent = error;
            return false;
        }

        input.classList.remove('invalid');
        input.classList.add('valid');
        if (errorEl) errorEl.textContent = '';
        return true;
    }

    // Live validation on blur
    form.querySelectorAll('input, textarea').forEach((input) => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => {
            if (input.classList.contains('invalid')) {
                validateField(input);
            }
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fields = form.querySelectorAll('input[required], textarea[required]');
        let allValid = true;

        fields.forEach((field) => {
            if (!validateField(field)) allValid = false;
        });

        if (!allValid) {
            Toast.show('Please fix the errors before submitting.', 'error');
            return;
        }

        const submitBtn = form.querySelector('.contact-submit-btn');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

        const payload = {
            name: document.getElementById('contactName').value.trim(),
            email: document.getElementById('contactEmail').value.trim(),
            phone: document.getElementById('contactPhone')?.value.trim() || '',
            subject: document.getElementById('contactSubject').value.trim(),
            message: document.getElementById('contactMessage').value.trim()
        };

        try {
            const response = await fetch(`${API_BASE}/api/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Show success state
                form.innerHTML = `
                    <div class="contact-success">
                        <i class="fa-solid fa-circle-check"></i>
                        <h3>Message Sent!</h3>
                        <p>Thanks for reaching out, ${payload.name.split(' ')[0]}. We'll get back to you within 24 hours.</p>
                    </div>
                `;
                Toast.show('Message sent successfully!', 'success');
            } else {
                const result = await response.json().catch(() => ({}));
                Toast.show(result.error || 'Failed to send message. Please try again.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHTML;
            }
        } catch {
            Toast.show('Could not connect to server. Please try again later.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        }
    });
}

/* ============================================================================
   YEAR IN FOOTER
   ============================================================================ */
function initFooterYear() {
    const el = document.getElementById('currentYear') || document.getElementById('footerYear');
    if (el) el.textContent = new Date().getFullYear();
}

/* ============================================================================
   BOOTSTRAP ALL SHARED FEATURES
   ============================================================================ */
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    initBackToTop();
    initContactForm();
    initFooterYear();
});
