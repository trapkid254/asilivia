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

    // Offline banner helpers
    function ensureOfflineBanner(){
        let b = document.getElementById('offlineBanner');
        if (!b){
            b = document.createElement('div');
            b.id = 'offlineBanner';
            b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:10px;background:#f59e0b;color:#111827;padding:8px 12px;border-radius:999px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:9999;font-size:14px;display:none;';
            b.textContent = 'Offline mode: showing cached data';
            document.body.appendChild(b);
        }
        return b;
    }
    async function updateOnlineStatus(){
        try {
            const up = await (window.api?.isBackendUp?.(false));
            const b = ensureOfflineBanner();
            b.style.display = up ? 'none' : 'block';
        } catch(_) { /* ignore */ }
    }

    // Track last known order statuses to surface changes via toast
    let lastOrderStatuses = {};
    try {
        const rawLOS = localStorage.getItem('lastOrderStatuses');
        const parsedLOS = rawLOS ? JSON.parse(rawLOS) : {};
        if (parsedLOS && typeof parsedLOS === 'object') lastOrderStatuses = parsedLOS;
    } catch(_) { lastOrderStatuses = {}; }

    // Simple order receipt modal
    function ensureOrderModal() {
        let modal = document.getElementById('orderReceiptModal');
        if (modal) return modal;
        modal = document.createElement('div');
        modal.id = 'orderReceiptModal';
        modal.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);z-index:9999;padding:16px;';
        modal.innerHTML = `
            <div id="orderReceiptContent" style="background:#fff;max-width:720px;width:96vw;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.2);overflow:hidden;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #eef2f7;">
                    <h3 style="margin:0;font-size:18px;">Order Receipt</h3>
                    <button id="orderReceiptClose" class="btn btn-secondary btn-small" style="padding:6px 10px;border-radius:6px;">Close</button>
                </div>
                <div id="orderReceiptBody" style="padding:16px;max-height:70vh;overflow:auto;"></div>
                <div style="display:flex;gap:10px;justify-content:flex-end;padding:12px 16px;border-top:1px solid #eef2f7;">
                    <button id="orderReceiptPrint" class="btn btn-secondary">Print</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', function(e){ if (e.target === modal) modal.style.display='none'; });
        modal.querySelector('#orderReceiptClose').addEventListener('click', function(){ modal.style.display='none'; });
        modal.querySelector('#orderReceiptPrint').addEventListener('click', function(){
            try {
                const body = modal.querySelector('#orderReceiptBody');
                const w = window.open('', '_blank');
                if (!w) return;
                w.document.write('<html><head><title>Order Receipt</title>');
                w.document.write('<link rel="stylesheet" href="/styles/main.css">');
                w.document.write('</head><body>');
                w.document.write(body.innerHTML);
                w.document.write('</body></html>');
                w.document.close();
                w.focus();
                w.print();
            } catch(_){}
        });
        return modal;
    }

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
    let lastRenderedOrders = [];
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

        let backendUp = false;
        if (window.api && current) {
            try {
                backendUp = await window.api.isBackendUp?.(false);
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
        // If backend is up, do not use local fallbacks; also clear stale caches
        if (backendUp) {
            try { localStorage.removeItem('orders'); } catch(_){}
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
        let backendUpV = false;
        if (window.api && current) {
            try {
                backendUpV = await window.api.isBackendUp?.(false);
                const params = new URLSearchParams();
                if (current.email) params.set('email', String(current.email).trim());
                if (current.phone) params.set('phone', String(current.phone).trim());
                const fetched = await window.api.getJSON('/api/vouchers/by-customer?' + params.toString());
                if (Array.isArray(fetched)) vouchers = fetched;
            } catch (_) { /* fallback below */ }
        }
        if (!vouchers.length && !backendUpV) {
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
        // Clear local vouchers cache if backend is up
        if (backendUpV) {
            try { /* no direct vouchers key; rely on backend */ } catch(_){}
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

        if (!orders.length && !backendUp) {
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
        // If backend is up and still no orders, intentionally show none
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
        // Keep a copy for lookup on View
        lastRenderedOrders = orders.slice();
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

    // Order details: delegated handler to open receipt modal
    document.addEventListener('click', function(e){
        const btn = e.target.closest('.view-order-details');
        if (!btn) return;
        const orderId = btn.getAttribute('data-order');
        if (!orderId) return;
        const order = lastRenderedOrders.find(o => String(o.id) === String(orderId));
        if (!order) return;
        const modal = ensureOrderModal();
        const body = modal.querySelector('#orderReceiptBody');
        // Build receipt HTML
        const itemsRows = Array.isArray(order.items)? order.items.map(i => {
            const qty = Number(i.qty||1);
            const price = Number(i.price||0);
            const line = qty * price;
            return `<tr>
                <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;">${i.name||''}</td>
                <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;">${qty}</td>
                <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;">KSh ${price.toFixed(2)}</td>
                <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;">KSh ${line.toFixed(2)}</td>
            </tr>`;
        }).join('') : '';
        const subtotal = Array.isArray(order.items)? order.items.reduce((s,i)=> s + Number(i.price||0)*Number(i.qty||1), 0) : Number(order.total||0);
        const cust = order.customer || {};
        const fullName = [cust.firstName, cust.lastName].filter(Boolean).join(' ') || cust.name || '';
        const status = String(order.status||'').toLowerCase();
        const statusColor = status==='completed'||status==='delivered' ? '#16a34a' : status==='cancelled'||status==='refunded' ? '#dc2626' : '#2563eb';
        body.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div>
                    <div style="font-weight:700;font-size:20px;">Aslivia</div>
                    <div class="text-muted" style="color:#6b7280;">Order Receipt</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:12px;color:#6b7280;">Order ID</div>
                    <div style="font-weight:600;">${order.id||''}</div>
                </div>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin:8px 0 14px;">
                <div style="flex:1;">
                    <div style="font-size:12px;color:#6b7280;">Customer</div>
                    <div style="font-weight:600;">${fullName}</div>
                    <div style="color:#4b5563;">${cust.email||''}${cust.phone? ' | '+cust.phone:''}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:12px;color:#6b7280;">Date</div>
                    <div>${order.date ? new Date(order.date).toLocaleString() : ''}</div>
                    <div style="margin-top:6px;"><span style="display:inline-block;padding:4px 10px;border-radius:999px;color:#fff;background:${statusColor};text-transform:capitalize;">${order.status||'pending'}</span></div>
                </div>
            </div>
            <div style="border:1px solid #eef2f7;border-radius:10px;overflow:hidden;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f9fafb;">
                            <th style="text-align:left;padding:10px 12px;border-bottom:1px solid #eef2f7;">Item</th>
                            <th style="text-align:left;padding:10px 12px;border-bottom:1px solid #eef2f7;">Qty</th>
                            <th style="text-align:left;padding:10px 12px;border-bottom:1px solid #eef2f7;">Price</th>
                            <th style="text-align:left;padding:10px 12px;border-bottom:1px solid #eef2f7;">Line Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows || '<tr><td colspan="4" style="padding:12px;">No items</td></tr>'}
                    </tbody>
                </table>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:12px;">
                <div style="min-width:240px;">
                    <div style="display:flex;justify-content:space-between;padding:6px 0;color:#4b5563;">
                        <span>Subtotal</span>
                        <span>KSh ${subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px dashed #e5e7eb;font-weight:700;">
                        <span>Total</span>
                        <span>KSh ${Number(order.total||subtotal).toFixed(2)}</span>
                    </div>
                </div>
            </div>
            <div style="margin-top:10px;color:#6b7280;font-size:12px;">Thank you for your order!</div>
        `;
        modal.style.display = 'flex';
    });
    
    function getCurrentIdent(){
        try {
            const raw = localStorage.getItem('currentCustomer');
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && (parsed.email || parsed.phone)) return { email: parsed.email||'', phone: parsed.phone||'' };
        } catch(_){ }
        return { email: '', phone: '' };
    }

    function ensureBookingModal(){
        let modal = document.getElementById('custBookingModal');
        if (modal) return modal;
        modal = document.createElement('div');
        modal.id = 'custBookingModal';
        modal.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);z-index:9999;padding:16px;';
        modal.innerHTML = `
            <div style="background:#fff;max-width:720px;width:96vw;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.2);overflow:hidden;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #eef2f7;">
                    <h3 style="margin:0;font-size:18px;">Repair Booking</h3>
                    <button id="custBookingClose" class="btn btn-secondary btn-small" style="padding:6px 10px;border-radius:6px;">Close</button>
                </div>
                <div id="custBookingBody" style="padding:16px;max-height:70vh;overflow:auto;"></div>
                <div style="display:flex;gap:10px;justify-content:flex-end;padding:12px 16px;border-top:1px solid #eef2f7;">
                    <button id="custBookingDecline" class="btn btn-secondary" style="display:none;">Decline Quote</button>
                    <button id="custBookingAccept" class="btn btn-primary" style="display:none;">Accept Quote</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', function(e){ if (e.target === modal) modal.style.display='none'; });
        modal.querySelector('#custBookingClose')?.addEventListener('click', function(){ modal.style.display='none'; });
        return modal;
    }

    // Repair request details with quote accept/decline
    document.addEventListener('click', async function(e){
        const btn = e.target.closest('.view-repair-details');
        if (!btn) return;
        const bookingId = btn.getAttribute('data-repair');
        if (!bookingId) return;
        // Try fetch from backend with ident filter, fallback to lastRenderedBookings if available
        let booking = null;
        try {
            const resp = await window.api.getJSON(`/api/bookings/${encodeURIComponent(bookingId)}`);
            booking = resp;
        } catch(_){ /* ignore */ }
        if (!booking && window.dataManager) {
            try {
                const all = window.dataManager.getBookings();
                booking = all.find(b => String(b.id) === String(bookingId));
            } catch(_){ }
        }
        if (!booking) return showToast('Booking not found', 'error');

        const modal = ensureBookingModal();
        const body = modal.querySelector('#custBookingBody');
        const btnAccept = modal.querySelector('#custBookingAccept');
        const btnDecline = modal.querySelector('#custBookingDecline');
        const cust = booking.customer || {};
        const device = booking.device || {};
        const issue = booking.issue || {};

        const status = String(booking.status||'').toLowerCase();
        const qStatus = String(booking.quoteStatus||'none');
        const quoteInfo = booking.quoteAmount ? `KSh ${Number(booking.quoteAmount||0).toFixed(2)}` : '';

        body.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div>
                    <div style="font-weight:700;font-size:20px;">Aslivia</div>
                    <div class="text-muted" style="color:#6b7280;">Repair Booking</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:12px;color:#6b7280;">Booking ID</div>
                    <div style="font-weight:600;">${booking._id || booking.id || ''}</div>
                </div>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin:8px 0 14px;">
                <div style="flex:1;">
                    <div style="font-size:12px;color:#6b7280;">Customer</div>
                    <div style="font-weight:600;">${[cust.firstName,cust.lastName].filter(Boolean).join(' ') || cust.name || ''}</div>
                    <div style="color:#4b5563;">${cust.email||''}${cust.phone? ' | '+cust.phone:''}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:12px;color:#6b7280;">Date</div>
                    <div>${booking.createdAt ? new Date(booking.createdAt).toLocaleString() : ''}</div>
                    <div style="margin-top:6px;"><span style="display:inline-block;padding:4px 10px;border-radius:999px;color:#fff;background:#2563eb;text-transform:capitalize;">${status}</span></div>
                </div>
            </div>
            <div style="border:1px solid #eef2f7;border-radius:10px;padding:12px;">
                <div style="display:flex;gap:16px;">
                    <div style="flex:1;">
                        <div style="font-size:12px;color:#6b7280;">Device</div>
                        <div>${[device.brand, device.model].filter(Boolean).join(' ')}</div>
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:12px;color:#6b7280;">Issue</div>
                        <div>${issue.type||''}</div>
                    </div>
                </div>
                ${booking.quoteStatus && booking.quoteStatus !== 'none' ? `
                <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e5e7eb;">
                    <div style="font-size:12px;color:#6b7280;">Quote</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <div><strong>Status:</strong> ${booking.quoteStatus}</div>
                            <div><strong>Amount:</strong> ${quoteInfo || 'N/A'}</div>
                            ${booking.quoteNote ? `<div><strong>Note:</strong> ${booking.quoteNote}</div>`:''}
                        </div>
                    </div>
                </div>` : ''}
            </div>
        `;

        // Show accept/decline only if proposed
        const showActions = qStatus === 'proposed';
        btnAccept.style.display = showActions ? 'inline-block' : 'none';
        btnDecline.style.display = showActions ? 'inline-block' : 'none';

        btnAccept.onclick = async function(){
            const ident = getCurrentIdent();
            try {
                const resp = await window.api.postJSON(`/api/bookings/${encodeURIComponent(booking._id || booking.id)}/quote/accept`, ident);
                if (resp && resp.quoteStatus === 'accepted') {
                    showToast('Quote accepted. We will proceed with your repair.', 'success');
                    modal.style.display = 'none';
                    renderBookings();
                } else {
                    showToast('Failed to accept quote.', 'error');
                }
            } catch(_) {
                showToast('Network error accepting quote.', 'error');
            }
        };
        btnDecline.onclick = async function(){
            const ident = getCurrentIdent();
            try {
                const resp = await window.api.postJSON(`/api/bookings/${encodeURIComponent(booking._id || booking.id)}/quote/decline`, ident);
                if (resp && resp.quoteStatus === 'declined') {
                    showToast('Quote declined.', 'info');
                    modal.style.display = 'none';
                    renderBookings();
                } else {
                    showToast('Failed to decline quote.', 'error');
                }
            } catch(_) {
                showToast('Network error declining quote.', 'error');
            }
        };

        modal.style.display = 'flex';
    });
    
    // Periodically refresh and update online status
    try { setInterval(()=>{ try{ renderOrders(); }catch(_){}; updateOnlineStatus(); }, 60000); } catch(_){}
    window.addEventListener('focus', function(){ renderOrders(); updateOnlineStatus(); });
    document.addEventListener('visibilitychange', function(){ if (!document.hidden) { renderOrders(); updateOnlineStatus(); } });

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