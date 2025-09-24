document.addEventListener('DOMContentLoaded', function() {
    // Ensure data manager is available (loaded in dashboard.html)
    const hasDM = typeof window.dataManager !== 'undefined';

    // Dashboard navigation
    const dashboardLinks = document.querySelectorAll('.dashboard-menu a');
    const dashboardSections = document.querySelectorAll('.dashboard-section');
    
    dashboardLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            dashboardLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Hide all sections
            dashboardSections.forEach(section => section.classList.remove('active'));
            
            // Show the target section
            const targetId = this.getAttribute('data-section');
            document.getElementById(targetId).classList.add('active');
        });
    });
    
    // Load orders from localStorage into Orders table
    async function renderOrders() {
        const table = document.querySelector('#orders table.orders-table tbody');
        if (!table) return;
        // Fetch orders (backend first)
        let orders = [];
        // current already loaded above

        if (window.api && current) {
            try {
                const params = new URLSearchParams();
                if (current.email) params.set('email', String(current.email).trim());
                if (current.phone) params.set('phone', String(current.phone).trim());
                const fetched = await window.api.getJSON('/api/orders?' + params.toString());
                if (Array.isArray(fetched)) {
                    orders = fetched.map(o => ({
                        id: o._id || o.id,
                        date: o.createdAt || o.date,
                        items: Array.isArray(o.items)? o.items.map(i=>({name:i.name, qty:i.qty, price:i.price})) : [],
                        total: Number(o.total)||0,
                        status: o.status || 'pending',
                        customer: o.customer || {}
                    }));
                }
            } catch (_) { /* fallback below */ }
        }

        if (!orders.length) {
            // Fallbacks
            if (hasDM) {
                orders = window.dataManager.getOrders();
            } else {
                try {
                    const raw = localStorage.getItem('orders');
                    const parsed = raw ? JSON.parse(raw) : [];
                    if (Array.isArray(parsed)) orders = parsed;
                } catch (e) { /* ignore */ }
            }
        }
        // Filter to current customer only (by email or phone)
        // current already loaded above
        if (current) {
            const email = String(current.email || '').trim().toLowerCase();
            const phone = String(current.phone || '').replace(/\s+/g,'');
            orders = orders.filter(o => {
                const ce = String(o?.customer?.email || '').trim().toLowerCase();
                const cp = String(o?.customer?.phone || '').replace(/\s+/g,'');
                return (email && ce === email) || (phone && cp === phone);
            });
        } else {
            // No identified customer; show none to avoid leaking others' orders
            orders = [];
        }
        // Clear existing rows
        table.innerHTML = '';
        if (!orders.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 6;
            td.textContent = 'No orders yet.';
            tr.appendChild(td);
            table.appendChild(tr);
            return;
        }
        // Build rows
        orders.forEach(order => {
            const tr = document.createElement('tr');
            const dateStr = new Date(order.date).toLocaleDateString();
            const itemsLabel = (order.items && order.items.length)
                ? order.items.map(i => i.name + (i.qty ? ` x${i.qty}` : '')).join(', ')
                : '';
            const totalStr = 'KSh ' + Number(order.total || 0).toFixed(2);
            tr.innerHTML = `
                <td>${order.id || ''}</td>
                <td>${dateStr}</td>
                <td>${itemsLabel}</td>
                <td>${totalStr}</td>
                <td><span class="order-status status-${(order.status||'processing').toLowerCase()}">${order.status || 'Processing'}</span></td>
                <td>
                    <button class="btn btn-small view-order-details" data-order="${order.id}">View</button>
                </td>`;
            table.appendChild(tr);
        });
    }

    // Render bookings into Repairs section
    async function renderBookings() {
        const container = document.querySelector('#repairs .repair-requests');
        if (!container) return;
        let bookings = [];
        // current customer
        let current = null;
        try {
            const rawC = localStorage.getItem('currentCustomer');
            const parsedC = rawC ? JSON.parse(rawC) : null;
            if (parsedC && (parsedC.email || parsedC.phone)) current = parsedC;
        } catch (e) { /* ignore */ }

        // Backend first
        if (window.api && current) {
            try {
                const params = new URLSearchParams();
                if (current.email) params.set('email', String(current.email).trim());
                if (current.phone) params.set('phone', String(current.phone).trim());
                const fetched = await window.api.getJSON('/api/bookings?' + params.toString());
                if (Array.isArray(fetched)) bookings = fetched;
            } catch (_) { /* fallback below */ }
        }
        // Fallbacks
        if (!bookings.length) {
            if (hasDM) {
                bookings = window.dataManager.getBookings();
            } else {
                try {
                    const raw = localStorage.getItem('bookings');
                    const parsed = raw ? JSON.parse(raw) : [];
                    if (Array.isArray(parsed)) bookings = parsed;
                } catch(e) { /* ignore */ }
            }
        }
        // Filter to current customer only (current already loaded above)
        if (current) {
            const email = String(current.email || '').trim().toLowerCase();
            const phone = String(current.phone || '').replace(/\s+/g,'');
            bookings = bookings.filter(b => {
                const ce = String(b?.customer?.email || '').trim().toLowerCase();
                const cp = String(b?.customer?.phone || '').replace(/\s+/g,'');
                return (email && ce === email) || (phone && cp === phone);
            });
        } else {
            bookings = [];
        }

        container.innerHTML = '';
        if (!bookings.length) {
            const empty = document.createElement('p');
            empty.textContent = 'No repair bookings yet.';
            container.appendChild(empty);
            return;
        }

        bookings.slice().reverse().forEach(b => {
            const created = b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '';
            const title = `${b.device?.brand || ''} ${b.device?.model || ''} - ${b.issue?.type || 'Repair'}`.trim();
            const statusClass = (b.status || 'pending').toLowerCase().replace(/\s+/g,'-');
            const card = document.createElement('div');
            card.className = 'repair-card';
            card.innerHTML = `
                <div class="repair-header">
                    <span class="repair-id">${b.id || ''}</span>
                    <span class="repair-date">${created}</span>
                </div>
                <div class="repair-details">
                    <h4>${title}</h4>
                    <p>Status: <span class="status-${statusClass}">${b.status || 'Pending'}</span></p>
                    <p>Urgency: ${b.service?.urgency || 'standard'}</p>
                </div>
                <div class="repair-actions">
                    <button class="btn btn-small view-repair-details" data-repair="${b.id}">View Details</button>
                </div>`;
            container.appendChild(card);
        });
    }

    // Update overview cards based on current user data
    function updateOverview() {
        const totalOrdersEl = document.querySelector('#overview .overview-cards .overview-card:nth-child(1) h3');
        const totalRepairsEl = document.querySelector('#overview .overview-cards .overview-card:nth-child(2) h3');

        // Reuse filtered data by calling render functions' internals lightly
        let orders = hasDM ? window.dataManager.getOrders() : [];
        let bookings = hasDM ? window.dataManager.getBookings() : [];
        let current = null;
        try {
            const rawC = localStorage.getItem('currentCustomer');
            const parsedC = rawC ? JSON.parse(rawC) : null;
            if (parsedC && (parsedC.email || parsedC.phone)) current = parsedC;
        } catch (e) { /* ignore */ }
        if (current) {
            const email = String(current.email || '').trim().toLowerCase();
            const phone = String(current.phone || '').replace(/\s+/g,'');
            const filtByCust = (arr) => arr.filter(x => {
                const ce = String(x?.customer?.email || '').trim().toLowerCase();
                const cp = String(x?.customer?.phone || '').replace(/\s+/g,'');
                return (email && ce === email) || (phone && cp === phone);
            });
            orders = filtByCust(orders);
            bookings = filtByCust(bookings);
        } else {
            orders = [];
            bookings = [];
        }
        if (totalOrdersEl) totalOrdersEl.textContent = String(orders.length);
        if (totalRepairsEl) totalRepairsEl.textContent = String(bookings.length);
    }

    // Order details modal
    const orderDetailButtons = document.querySelectorAll('.view-order-details');
    orderDetailButtons.forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order');
            alert(`Order details for ${orderId} would be displayed here.`);
        });
    });
    
    // Repair request details
    const repairDetailButtons = document.querySelectorAll('.view-repair-details');
    repairDetailButtons.forEach(button => {
        button.addEventListener('click', function() {
            const repairId = this.getAttribute('data-repair');
            alert(`Repair request details for ${repairId} would be displayed here.`);
        });
    });
    
    // Profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Profile information updated successfully!');
        });
    }
    
    // Address form submission
    const addressForm = document.getElementById('addressForm');
    if (addressForm) {
        addressForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Address information updated successfully!');
        });
    }
    
    // Password form submission
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (newPassword !== confirmPassword) {
                alert('Passwords do not match. Please try again.');
                return;
            }
            
            alert('Password updated successfully!');
            passwordForm.reset();
        });
    }
    
    // Initialize
    renderOrders();
    renderBookings();
    updateOverview();

    // Live refresh when data changes
    window.addEventListener('dataChanged', function(evt) {
        const t = evt?.detail?.type;
        if (t === 'orders' || t === 'bookings') {
            renderOrders();
            renderBookings();
            updateOverview();
        }
    });
    // If URL hash points to a section, open it
    function activateSectionByHash() {
        const hash = window.location.hash.replace('#', '');
        if (!hash) return;
        const link = document.querySelector(`.dashboard-menu a[data-section="${hash}"]`);
        if (link) link.click();
    }
    activateSectionByHash();
    if (dashboardLinks.length > 0 && !window.location.hash) {
        dashboardLinks[0].click();
    }
});