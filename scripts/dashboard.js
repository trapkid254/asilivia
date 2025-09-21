document.addEventListener('DOMContentLoaded', function() {
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
    function renderOrders() {
        const table = document.querySelector('#orders table.orders-table tbody');
        if (!table) return;
        // Fetch orders
        let orders = [];
        try {
            const raw = localStorage.getItem('orders');
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) orders = parsed;
        } catch (e) { /* ignore */ }
        // Filter to current customer only (by email or phone)
        let current = null;
        try {
            const rawC = localStorage.getItem('currentCustomer');
            const parsedC = rawC ? JSON.parse(rawC) : null;
            if (parsedC && (parsedC.email || parsedC.phone)) current = parsedC;
        } catch (e) { /* ignore */ }
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
                <td><span class="order-status status-processing">${order.status || 'Processing'}</span></td>
                <td>
                    <button class="btn btn-small view-order-details" data-order="${order.id}">View</button>
                </td>`;
            table.appendChild(tr);
        });
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