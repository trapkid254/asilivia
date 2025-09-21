// Mobile menu toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const nav = document.querySelector('nav');

if (mobileMenuBtn && nav) {
    mobileMenuBtn.addEventListener('click', () => {
        nav.classList.toggle('active');
    });
}

// ===== Cart (Header count and add-to-cart) =====
function ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.setAttribute('style', [
            'position:fixed',
            'top:16px',
            'right:16px',
            'z-index:9999',
            'display:flex',
            'flex-direction:column',
            'gap:10px'
        ].join(';'));
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('style', [
        'min-width:240px',
        'max-width:360px',
        'background:#222',
        'color:#fff',
        'padding:12px 14px',
        'border-radius:6px',
        'box-shadow:0 6px 20px rgba(0,0,0,0.25)',
        'font-size:14px',
        'opacity:0',
        'transform:translateY(-6px)',
        'transition:opacity .2s ease, transform .2s ease'
    ].join(';'));
    toast.textContent = message;
    container.appendChild(toast);
    // animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });
    // auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-6px)';
        setTimeout(() => {
            toast.remove();
        }, 200);
    }, 1800);
}
function getCart() {
    try {
        const raw = localStorage.getItem('cart');
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        // sanitize
        return parsed.map(it => ({
            id: String(it.id ?? ''),
            name: String(it.name ?? ''),
            price: Math.max(0, Number(it.price) || 0),
            image: String(it.image ?? ''),
            qty: Math.max(0, parseInt(it.qty) || 0),
        })).filter(it => it.qty > 0);
    } catch (e) {
        return [];
    }
}

function setCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function cartCountFromCart(cart) {
    return cart.reduce((sum, it) => sum + (parseInt(it.qty) || 0), 0);
}

function updateHeaderCartCount() {
    const el = document.querySelector('.cart-count');
    if (!el) return;
    const cart = getCart();
    const count = Math.max(0, cartCountFromCart(cart));
    el.textContent = String(count);
    localStorage.setItem('cartCount', count);
}

// Cart functionality
function initializeCart() {
    const addToCartButtons = document.querySelectorAll('.btn-add-to-cart');
    const cartCount = document.querySelector('.cart-count');
    // Sync header count from actual cart storage
    updateHeaderCartCount();
    
    addToCartButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            // Build product from DOM context
            const container = button.closest('.product-card, .product-item, .product-content, .product-info') || document;
            const titleEl = container.querySelector('.product-title, .product-item-title, h3, h1');
            const priceEl = container.querySelector('.product-price, .product-item-price, .current-price');
            const imgEl = container.querySelector('img');
            const id = button.dataset.id || (titleEl ? titleEl.textContent.trim() : 'item-' + Date.now());
            const name = titleEl ? titleEl.textContent.trim() : 'Item';
            const priceText = priceEl ? priceEl.textContent : '0';
            const price = Math.max(0, parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0);
            const image = imgEl ? imgEl.getAttribute('src') : '';

            const cart = getCart();
            const existing = cart.find(it => it.id === id);
            if (existing) {
                existing.qty += 1;
            } else {
                cart.push({ id, name, price, image, qty: 1 });
            }
            setCart(cart);
            updateHeaderCartCount();
            // Toast notification
            showToast(`${name} added to cart`);
            
            // Show added to cart message
            const originalText = button.textContent;
            button.textContent = 'Added to Cart!';
            button.disabled = true;
            
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 1500);
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeCart();
    initializeTheme();
    injectThemeToggle();
});

// ===== Theme (Dark/Light) Toggle =====
function getSystemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('theme-dark', isDark);
    localStorage.setItem('theme', theme);
    // Update toggle label/icon if present
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
        toggle.innerHTML = isDark
            ? '<i class="fas fa-moon"></i> Dark'
            : '<i class="fas fa-sun"></i> Light';
    }
}

function initializeTheme() {
    const saved = localStorage.getItem('theme');
    const theme = saved || (getSystemPrefersDark() ? 'dark' : 'light');
    applyTheme(theme);

    // React to system preference changes
    if (window.matchMedia) {
        try {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            mq.addEventListener('change', (e) => {
                const savedTheme = localStorage.getItem('theme');
                if (!savedTheme) {
                    applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        } catch (e) {
            // Safari fallback
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            mq.addListener((e2) => {
                const savedTheme = localStorage.getItem('theme');
                if (!savedTheme) {
                    applyTheme(e2.matches ? 'dark' : 'light');
                }
            });
        }
    }
}

function injectThemeToggle() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    const isDark = document.documentElement.classList.contains('theme-dark');
    btn.innerHTML = isDark ? '<i class="fas fa-moon"></i> Dark' : '<i class="fas fa-sun"></i> Light';
    btn.addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('theme-dark') ? 'light' : 'dark';
        applyTheme(newTheme);
    });
    headerActions.prepend(btn);
}