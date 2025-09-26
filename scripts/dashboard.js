document.addEventListener('DOMContentLoaded', function() {
    // Ensure data manager is available (loaded in dashboard.html)
    const hasDM = typeof window.dataManager !== 'undefined';

    // Toast helpers (customer site)
    function ensureToastContainer(){
        let c = document.querySelector('.toast-container');
        if (!c) {
            c = document.createElement('div');
            c.className = 'toast-container';
            document.body.appendChild(c);
        }
        return c;
    }
    function showToast(message, type='info'){
        const c = ensureToastContainer();
        const t = document.createElement('div');
        t.className = 'toast ' + (type==='success'?'toast-success':type==='error'?'toast-error':'toast-info');
        t.textContent = message;
        c.appendChild(t);
        setTimeout(()=>{ try{ t.remove(); }catch(_){ } }, 5000);
    }

    // Track last known order statuses to surface changes via toast
    let lastOrderStatuses = {};
    try {
        const rawLOS = localStorage.getItem('lastOrderStatuses');
        const parsedLOS = rawLOS ? JSON.parse(rawLOS) : {};
        if (parsedLOS && typeof parsedLOS === 'object') lastOrderStatuses = parsedLOS;
    } catch(_) { lastOrderStatuses = {}; }

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
        // Load current customer identity
        let current = null;
        try {
            const raw = localStorage.getItem('currentCustomer');
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && (parsed.email || parsed.phone)) current = parsed;
        } catch (_) { /* ignore */ }

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

    // Render vouchers into Vouchers section
    async function renderVouchers() {
        const tbody = document.getElementById('vouchersTableBody');
        if (!tbody) return;
        // Get current customer identity
        let current = null;
        try {
            const raw = localStorage.getItem('currentCustomer');
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && (parsed.email || parsed.phone)) current = parsed;
        } catch (_) { /* ignore */ }
        let vouchers = [];
        if (window.api && current) {
            try {
                const params = new URLSearchParams();
                if (current.email) params.set('email', String(current.email).trim());
                if (current.phone) params.set('phone', String(current.phone).trim());
                const fetched = await window.api.getJSON('/api/vouchers/by-customer?' + params.toString());
                if (Array.isArray(fetched)) vouchers = fetched;
            } catch (_) { /* fallback below */ }
        }
        if (!vouchers.length) {
            // Fallback to local storage vouchers via dataManager
            try {
                const all = (window.dataManager?.getVouchers?.() || []);
                if (current) {
                    vouchers = all.filter(v => !v.assignedTo || ( (v.assignedTo.email && v.assignedTo.email === current.email) || (v.assignedTo.phone && v.assignedTo.phone === current.phone) ));
                } else {
                    vouchers = [];
                }
            } catch (_) { vouchers = []; }
        }
        tbody.innerHTML = '';
        if (!vouchers.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 5;
            td.textContent = 'No vouchers available.';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        vouchers.forEach(v => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${v.code}</td>
                <td>KSh ${Number(v.amount||0).toFixed(2)}</td>
                <td>${v.used ? 'Used' : 'Active'}</td>
                <td>${v.assignedTo?.email || v.assignedTo?.phone || ''}</td>
                <td>${v.usedAt ? new Date(v.usedAt).toLocaleString() : ''}</td>`;
            tbody.appendChild(tr);
        });
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
        // Detect status changes vs last known
        try {
            const currentMap = {};
            orders.forEach(o => {
                const id = String(o.id||'');
                const status = String(o.status||'').toLowerCase();
                currentMap[id] = status;
                const prev = lastOrderStatuses[id];
                if (prev && prev !== status) {
                    showToast(`Order ${id} status updated to ${o.status}`, 'info');
                }
            });
            lastOrderStatuses = currentMap;
            localStorage.setItem('lastOrderStatuses', JSON.stringify(lastOrderStatuses));
        } catch(_) { /* ignore */ }
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
    
    // Populate profile details and greeting from current customer
    function populateProfileFromCurrent() {
        let current = null;
        try {
            const raw = localStorage.getItem('currentCustomer');
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && (parsed.email || parsed.phone)) current = parsed;
        } catch (_) { /* ignore */ }
        if (!current) return;
        // Welcome text
        const welcomeP = document.querySelector('#overview .dashboard-header p');
        if (welcomeP) {
            const name = current.firstName && current.lastName
                ? `${current.firstName} ${current.lastName}`
                : (current.name || '').trim() || (current.email || current.phone || '');
            welcomeP.textContent = `Welcome back, ${name}! Here's what's happening with your orders and repair requests.`;
        }
        // Profile form fields
        const fn = document.getElementById('profileFirstName');
        const ln = document.getElementById('profileLastName');
        const em = document.getElementById('profileEmail');
        const ph = document.getElementById('profilePhone');
        // Derive first/last from name if needed
        let firstName = current.firstName || '';
        let lastName = current.lastName || '';
        if ((!firstName || !lastName) && current.name) {
            const parts = String(current.name).trim().split(/\s+/);
            firstName = firstName || (parts[0] || '');
            lastName = lastName || (parts.slice(1).join(' ') || '');
        }
        if (fn && firstName) fn.value = firstName;
        if (ln && lastName) ln.value = lastName;
        if (em && current.email) em.value = current.email;
        if (ph && current.phone) ph.value = current.phone;
    }

    // Initialize
    populateProfileFromCurrent();
    renderOrders();
    renderBookings();
    renderVouchers();
    updateOverview();

    // Live refresh when data changes
    window.addEventListener('dataChanged', function(evt) {
        const t = evt?.detail?.type;
        if (t === 'orders' || t === 'bookings' || t === 'vouchers') {
            populateProfileFromCurrent();
            renderOrders();
            renderBookings();
            renderVouchers();
            updateOverview();
        }
    });
    // Re-fetch when tab becomes visible or window gains focus
    document.addEventListener('visibilitychange', function(){
        if (!document.hidden) {
            renderOrders();
            renderBookings();
            renderVouchers();
            updateOverview();
        }
    });
    window.addEventListener('focus', function(){
        renderOrders();
        renderBookings();
        renderVouchers();
        updateOverview();
    });
    // Lightweight periodic refresh (every 60s)
    try {
        setInterval(function(){
            renderOrders();
        }, 60000);
    } catch(_) { /* ignore */ }
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