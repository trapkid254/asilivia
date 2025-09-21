document.addEventListener('DOMContentLoaded', function() {
    // Sidebar toggle
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.admin-sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Notification button
    const notificationBtn = document.querySelector('.notification-btn');
    
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            alert('Notifications feature will be implemented here');
        });
    }
    
    // Admin profile dropdown
    const adminProfile = document.querySelector('.admin-profile');
    
    if (adminProfile) {
        adminProfile.addEventListener('click', function() {
            alert('Profile dropdown will be implemented here');
        });
    }
    
    // Render customer orders from localStorage into Recent Orders table
    function renderCustomerOrders() {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        let orders = [];
        try {
            const raw = localStorage.getItem('orders');
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) orders = parsed;
        } catch (e) { /* ignore */ }

        tbody.innerHTML = '';
        let totalRevenue = 0;
        if (!orders.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 6;
            td.textContent = 'No customer orders yet.';
            tr.appendChild(td);
            tbody.appendChild(tr);
        } else {
            orders.forEach(order => {
                totalRevenue += Number(order.total || 0);
                const tr = document.createElement('tr');
                const dateStr = new Date(order.date).toLocaleDateString();
                tr.innerHTML = `
                    <td>${order.id || ''}</td>
                    <td>${(order.customer && order.customer.name) ? order.customer.name : 'Customer'}</td>
                    <td>${dateStr}</td>
                    <td>KSh ${Number(order.total || 0).toFixed(2)}</td>
                    <td><span class="status ${order.status ? String(order.status).toLowerCase() : 'processing'}">${order.status || 'Processing'}</span></td>
                    <td>
                        <button class="action-btn view" title="View"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit" title="Edit"><i class="fas fa-edit"></i></button>
                    </td>`;
                tbody.appendChild(tr);
            });
        }

        // Update Total Revenue stat card if present
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            const icon = card.querySelector('.stat-icon i');
            if (icon && icon.classList.contains('fa-dollar-sign')) {
                const h3 = card.querySelector('.stat-info h3');
                if (h3) h3.textContent = `KSh ${totalRevenue.toFixed(2)}`;
            }
        });
    }

    // Action buttons
    const actionButtons = document.querySelectorAll('.action-btn');
    
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.classList.contains('view') ? 'View' : 
                          this.classList.contains('edit') ? 'Edit' : 'Delete';
            
            alert(`${action} action will be implemented here`);
        });
    });
    
    // Table row click
    const tableRows = document.querySelectorAll('.data-table tr');
    
    tableRows.forEach(row => {
        row.addEventListener('click', function(e) {
            if (!e.target.closest('.action-btn')) {
                alert('Row details will be shown here');
            }
        });
    });
    
    // Initial render for orders and revenue
    renderCustomerOrders();
});