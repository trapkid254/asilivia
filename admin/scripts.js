document.addEventListener('DOMContentLoaded', function() {
    // Require admin login: redirect if no token
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
    // Load persisted notifications on start
    loadNotifications();
        // Display admin username if available
        const uname = localStorage.getItem('adminUsername') || 'Admin';
        const prof = document.querySelector('.admin-profile span');
        if (prof) prof.textContent = uname;
        // Wire logout
        const logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(){
                try {
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminUsername');
                } catch(_) {}
                window.location.href = 'login.html';
            });
        }
    } catch (_) { /* ignore */ }
    // Load data manager
    const script = document.createElement('script');
    script.src = '../scripts/data-manager.js';
    document.head.appendChild(script);
    
    // Wait for data manager to load
    script.onload = function() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function(){
                initializeAdmin();
                if (typeof window.renderCustomerOrders === 'function') window.renderCustomerOrders();
            });
        } else {
            initializeAdmin();
            if (typeof window.renderCustomerOrders === 'function') window.renderCustomerOrders();
        }
    };
    
    // Sidebar toggle
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.admin-sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Notifications system
    const notificationBtn = document.querySelector('.notification-btn');
    const notifCountEl = document.querySelector('.notification-count');
    let notifications = [];
    let notifPanel = null;

    function ensureNotifPanel() {
        if (notifPanel) return notifPanel;
        notifPanel = document.createElement('div');
        notifPanel.className = 'notification-panel';
        notifPanel.innerHTML = `
            <div class="notification-panel-header">
                <h4>Notifications</h4>
                <button class="btn btn-secondary btn-sm" id="notifMarkAllRead">Mark all read</button>
            </div>
            <div class="notification-list" id="notificationList"></div>
        `;
        document.body.appendChild(notifPanel);
        // Mark all as read
        notifPanel.querySelector('#notifMarkAllRead')?.addEventListener('click', function(){
            notifications = notifications.map(n => ({ ...n, read: true }));
            updateNotificationCount();
            renderNotifications();
        });
        // Outside click closes
        document.addEventListener('click', function(e){
            if (!notifPanel) return;
            if (notifPanel.classList.contains('open')) {
                const inside = e.target.closest('.notification-panel') || e.target.closest('.notification-btn');
                if (!inside) notifPanel.classList.remove('open');
            }
        });
        return notifPanel;
    }

    function updateNotificationCount() {
        const unread = notifications.filter(n => !n.read).length;
        if (notifCountEl) notifCountEl.textContent = String(unread);
    }

    function renderNotifications() {
        ensureNotifPanel();
        const list = notifPanel.querySelector('#notificationList');
        list.innerHTML = '';
        if (!notifications.length) {
            const empty = document.createElement('div');
            empty.className = 'notification-empty';
            empty.textContent = 'No notifications yet.';
            list.appendChild(empty);
            return;
        }
        notifications.slice().reverse().forEach(n => {
            const item = document.createElement('div');
            item.className = 'notification-item' + (n.read ? ' read' : '');
            const when = n.at ? new Date(n.at).toLocaleString() : '';
            item.innerHTML = `
                <div class="notification-title">${n.title || ''}</div>
                <div class="notification-desc">${n.desc || ''}</div>
                <div class="notification-meta">${n.type || ''} • ${when}</div>
            `;
            list.appendChild(item);
        });
    }

    function saveNotifications() {
        try { localStorage.setItem('adminNotifications', JSON.stringify(notifications)); } catch(_){}
    }

    function loadNotifications() {
        try {
            const raw = localStorage.getItem('adminNotifications');
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) notifications = parsed; else notifications = [];
        } catch(_) { notifications = []; }
        updateNotificationCount();
        renderNotifications();
    }

    function pushNotification(n) {
        notifications.push({ ...n, read: false, at: n.at || new Date().toISOString() });
        updateNotificationCount();
        renderNotifications();
        saveNotifications();
    }

    if (notificationBtn) {
        notificationBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            ensureNotifPanel();
            notifPanel.classList.toggle('open');
            // Position panel under header-right area
            const rect = notificationBtn.getBoundingClientRect();
            notifPanel.style.top = Math.round(rect.bottom + 10) + 'px';
            notifPanel.style.right = Math.round(window.innerWidth - rect.right) + 'px';
            // Opening marks notifications as read
            if (notifPanel.classList.contains('open')) {
                notifications = notifications.map(n => ({ ...n, read: true }));
                updateNotificationCount();
                renderNotifications();
            }
        });
    }
    
    // Admin profile dropdown
    const adminProfile = document.querySelector('.admin-profile');
    
    if (adminProfile) {
        // Ensure menu exists
        let menu = document.querySelector('.admin-profile-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.className = 'admin-profile-menu';
            menu.innerHTML = `
                <ul>
                    <li><button type="button" class="profile-action" data-action="profile">Profile</button></li>
                    <li><button type="button" class="profile-action" data-action="settings">Settings</button></li>
                    <li><button type="button" class="profile-action" data-action="logout">Logout</button></li>
                </ul>
            `;
            adminProfile.parentElement?.appendChild(menu);
        }
        adminProfile.addEventListener('click', function(e) {
            e.stopPropagation();
            menu.classList.toggle('open');
        });
        // Outside click closes
        document.addEventListener('click', function(){ menu.classList.remove('open'); });
        // Handle actions
        menu.addEventListener('click', function(e){
            const btn = e.target.closest('.profile-action');
            if (!btn) return;
            const act = btn.getAttribute('data-action');
            if (act === 'logout') {
                document.getElementById('adminLogoutBtn')?.click();
            } else if (act === 'settings') {
                loadAdminSection('settings');
            } else if (act === 'profile') {
                alert('Profile page will be available soon.');
            }
            menu.classList.remove('open');
        });
    }
    
    // Render customer orders from localStorage into Recent Orders table
    async function renderCustomerOrders() {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        
        let orders = [];
        // Try backend first (admin view: all orders)
        if (window.api) {
            try {
                const token = localStorage.getItem('adminToken') || '';
                const resp = await fetch('/api/orders', { headers: token ? { 'x-admin-token': token } : {} });
                if (resp.ok) {
                    const data = await resp.json();
                    if (Array.isArray(data)) orders = data.map(o => ({
                        id: o._id || o.id,
                        customer: { name: (o.customer?.firstName || '') + ' ' + (o.customer?.lastName || ''), email: o.customer?.email, phone: o.customer?.phone },
                        date: o.createdAt || o.date,
                        total: o.total,
                        status: o.status || 'pending',
                        items: o.items || []
                    }));
                }
            } catch (_) { /* fallback below */ }
        }

        if (!orders.length) {
            if (window.dataManager) {
                orders = window.dataManager.getOrders();
            } else {
                // Fallback to direct localStorage access
                try {
                    const raw = localStorage.getItem('orders');
                    const parsed = raw ? JSON.parse(raw) : [];
                    if (Array.isArray(parsed)) orders = parsed;
                } catch (e) { /* ignore */ }
            }
        }

        tbody.innerHTML = '';
        if (!orders.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 6;
            td.textContent = 'No customer orders yet.';
            tr.appendChild(td);
            tbody.appendChild(tr);
        } else {
            orders.slice(-10).reverse().forEach(order => {
                const tr = document.createElement('tr');
                const dateStr = new Date(order.date).toLocaleDateString();
                tr.innerHTML = `
                    <td>${order.id || ''}</td>
                    <td>${(order.customer && order.customer.name) ? order.customer.name : 'Customer'}</td>
                    <td>${dateStr}</td>
                    <td>KSh ${Number(order.total || 0).toFixed(2)}</td>
                    <td><span class="status ${order.status ? String(order.status).toLowerCase() : 'processing'}">${order.status || 'Processing'}</span></td>
                    <td>
                        <button class="action-btn view" title="View" data-id="${order.id}"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit" title="Edit" data-id="${order.id}"><i class="fas fa-edit"></i></button>
                    </td>`;
                tbody.appendChild(tr);
            });
        }
    }

    // Action buttons (delegated event handling)
    document.addEventListener('click', function(e) {
        if (e.target.closest('.action-btn')) {
            const button = e.target.closest('.action-btn');
            const action = button.classList.contains('view') ? 'View' : 
                          button.classList.contains('edit') ? 'Edit' : 'Delete';
            const id = button.getAttribute('data-id');
            
            if (id) {
                handleOrderAction(action, id);
            } else {
                alert(`${action} action will be implemented here`);
            }
        }
    });
    
    // Handle order actions
    function handleOrderAction(action, orderId) {
        if (!window.dataManager) {
            alert(`${action} action will be implemented here`);
            return;
        }
        
        const orders = window.dataManager.getOrders();
        const order = orders.find(o => o.id === orderId);
        
        if (!order) {
            alert('Order not found');
            return;
        }
        
        switch (action) {
            case 'View':
                showOrderDetails(order);
                break;
            case 'Edit':
                editOrderStatus(order);
                break;
            default:
                alert(`${action} action will be implemented here`);
        }
    }
    
    // Show order details
    function showOrderDetails(order) {
        const details = `
            Order ID: ${order.id}
            Customer: ${order.customer ? order.customer.name : 'N/A'}
            Email: ${order.customer ? order.customer.email : 'N/A'}
            Phone: ${order.customer ? order.customer.phone : 'N/A'}
            Date: ${new Date(order.date).toLocaleString()}
            Total: KSh ${Number(order.total || 0).toFixed(2)}
            Status: ${order.status || 'Processing'}
            Items: ${order.items ? order.items.length : 0} item(s)
        `;
        alert(details);
    }
    
    // Edit order status
    function editOrderStatus(order) {
        const newStatus = prompt('Enter new status (pending, processing, shipped, delivered, cancelled):', order.status);
        if (newStatus && newStatus !== order.status) {
            window.dataManager.updateOrderStatus(order.id, newStatus);
            renderCustomerOrders();
            renderDashboardStats();
        }
    }
    
    // Table row click (delegated event handling)
    document.addEventListener('click', function(e) {
        const row = e.target.closest('.data-table tr');
        // Ignore clicks that originate from interactive controls like selects/buttons/inputs
        const onInteractive = !!(e.target.closest('.action-btn') || e.target.closest('select') || e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea'));
        if (row && !onInteractive && !row.closest('thead')) {
            // Get order ID from the first cell or action button
            const firstCell = row.querySelector('td');
            if (firstCell) {
                const orderId = firstCell.textContent.trim();
                if (orderId && window.dataManager) {
                    const orders = window.dataManager.getOrders();
                    const order = orders.find(o => o.id === orderId);
                    if (order) {
                        showOrderDetails(order);
                    }
                }
            }
        }
    });
    
    // Initial render for orders and revenue
    setTimeout(() => {
        renderCustomerOrders();
        if (window.dataManager) {
            renderDashboardStats();
        }
    }, 100);
    
    // Initialize sidebar navigation
    initializeSidebarNavigation();
});

// Initialize admin functionality
function initializeAdmin() {
    if (window.dataManager) {
        renderDashboardStats();
        renderCustomerOrders();
        
        // Listen for data changes
        window.addEventListener('dataChanged', function(event) {
            const { type } = event.detail;
            if (type === 'orders' || type === 'bookings' || type === 'customers') {
                renderDashboardStats();
                renderCustomerOrders();
                // Push simple notifications for admin
                if (type === 'orders') {
                    pushNotification({ type: 'Order', title: 'Order activity', desc: 'Orders have been updated.' });
                } else if (type === 'bookings') {
                    pushNotification({ type: 'Booking', title: 'Booking activity', desc: 'Repair bookings have been updated.' });
                } else if (type === 'customers') {
                    pushNotification({ type: 'Customer', title: 'Customer activity', desc: 'Customers list has been updated.' });
                }
            }
        });
    }
}

// Render dashboard statistics
function renderDashboardStats() {
    if (!window.dataManager) return;
    
    const stats = window.dataManager.getStatistics();
    
    // Update stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        const icon = card.querySelector('.stat-icon i');
        const h3 = card.querySelector('.stat-info h3');
        
        if (icon && h3) {
            if (icon.classList.contains('fa-shopping-cart')) {
                h3.textContent = stats.totalOrders;
            } else if (icon.classList.contains('fa-wrench')) {
                h3.textContent = stats.totalBookings;
            } else if (icon.classList.contains('fa-users')) {
                h3.textContent = stats.totalCustomers;
            } else if (icon.classList.contains('fa-dollar-sign')) {
                h3.textContent = `KSh ${stats.totalRevenue.toFixed(2)}`;
            }
        }
    });
}

// Initialize sidebar navigation
function initializeSidebarNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav a');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
            
            // Add active class to clicked item
            this.parentElement.classList.add('active');
            
            // Get the section name from the icon or text
            const icon = this.querySelector('i');
            let section = 'dashboard';
            
            if (icon.classList.contains('fa-box')) {
                section = 'products';
            } else if (icon.classList.contains('fa-shopping-cart')) {
                section = 'orders';
            } else if (icon.classList.contains('fa-wrench')) {
                section = 'bookings';
            } else if (icon.classList.contains('fa-users')) {
                section = 'customers';
            } else if (icon.classList.contains('fa-tools')) {
                section = 'services';
            } else if (icon.classList.contains('fa-tags')) {
                section = 'discounts';
            } else if (icon.classList.contains('fa-cog')) {
                section = 'settings';
            }
            
            // Load the appropriate section
            loadAdminSection(section);
        });
    });
}

// Load different admin sections
function loadAdminSection(section) {
    const contentArea = document.querySelector('.admin-content');
    const headerTitle = document.querySelector('.admin-header h1');
    
    if (!contentArea || !headerTitle) return;
    
    headerTitle.textContent = section.charAt(0).toUpperCase() + section.slice(1);
    
    switch (section) {
        case 'products':
            loadProductsSection(contentArea);
            break;
        case 'orders':
            loadOrdersSection(contentArea);
            break;
        case 'bookings':
            loadBookingsSection(contentArea);
            break;
        case 'customers':
            loadCustomersSection(contentArea);
            break;
        case 'services':
            loadServicesSection(contentArea);
            break;
        case 'discounts':
            loadDiscountsSection(contentArea);
            break;
        case 'settings':
            loadSettingsSection(contentArea);
            break;
        default:
            loadDashboardSection(contentArea);
    }
}

// Load products management section
function loadProductsSection(contentArea) {
    contentArea.innerHTML = `
        <div class="section-header">
            <h2>Product Management</h2>
            <div class="actions-inline">
                <span class="badge badge-gray" id="productsCountBadge">0 products</span>
                <input type="text" id="productSearch" placeholder="Search name, brand, category" />
                <select id="productStatusFilter">
                    <option value="all">All statuses</option>
                    <option value="active" selected>Active</option>
                    <option value="inactive">Inactive</option>
                </select>
                <button class="btn btn-primary" id="addProductBtn">
                    <i class="fas fa-plus"></i> Add Product
                </button>
            </div>
        </div>
        
        <div class="products-grid">
            <div id="productsContainer"></div>
        </div>
        
        <!-- Add Product Modal -->
        <div id="productModal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modalTitle">Add Product</h3>
                    <span class="close" title="Close">&times;</span>
                </div>
                <form id="productForm">
                    <div class="form-grid two-col">
                        <div class="form-group">
                            <label for="productName">Product Name</label>
                            <input type="text" id="productName" placeholder="e.g. iPhone 15 Pro" required>
                        </div>
                        <div class="form-group">
                            <label for="productPrice">Price (KSh)</label>
                            <input type="number" id="productPrice" step="0.01" min="0" placeholder="e.g. 145000" required>
                        </div>
                        <div class="form-group">
                            <label for="productCategory">Category</label>
                            <select id="productCategory" required>
                                <option value="">Select Category</option>
                                <option value="mobiles">Mobile Phones</option>
                                <option value="laptops">Laptops</option>
                                <option value="accessories">Accessories</option>
                                <option value="tablets">Tablets</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="productBrand">Brand</label>
                            <select id="productBrand" required>
                                <option value="">Select Brand</option>
                                <option value="apple">Apple</option>
                                <option value="samsung">Samsung</option>
                                <option value="dell">Dell</option>
                                <option value="hp">HP</option>
                                <option value="sony">Sony</option>
                                <option value="lenovo">Lenovo</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="productStock">Stock Quantity</label>
                            <input type="number" id="productStock" min="0" placeholder="e.g. 25" required>
                        </div>
                        <div class="form-group">
                            <label for="productImage">Image URL</label>
                            <input type="url" id="productImage" placeholder="https://example.com/image.jpg">
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label for="productImageFile">Upload Image</label>
                            <input type="file" id="productImageFile" accept="image/*">
                            <small>Optional. If you upload a file, it will be used instead of the URL.</small>
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label for="productDescription">Description</label>
                            <textarea id="productDescription" rows="4" placeholder="Short description, specs, key features..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="productFeatured">Featured</label>
                            <select id="productFeatured">
                                <option value="false" selected>No</option>
                                <option value="true">Yes</option>
                            </select>
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label>Preview</label>
                            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;display:flex;align-items:center;justify-content:center;height:160px;background:#fafafa;">
                                <img id="productImagePreview" src="../assets/images/placeholder-smartphone.jpg" alt="Preview" style="max-height:100%;max-width:100%;object-fit:contain;">
                            </div>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Product</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    // Initialize product management behaviors after rendering
    initializeProductsManagement();
}

// Initialize products management functionality
function initializeProductsManagement() {
    const addProductBtn = document.getElementById('addProductBtn');
    const productModal = document.getElementById('productModal');
    const productForm = document.getElementById('productForm');
    const closeBtn = productModal.querySelector('.close');
    const cancelBtn = document.getElementById('cancelBtn');
    
    let editingProductId = null;
    const searchInput = document.getElementById('productSearch');
    const statusFilter = document.getElementById('productStatusFilter');
    const countBadge = document.getElementById('productsCountBadge');
    
    // Render products
    async function renderProducts() {
        const container = document.getElementById('productsContainer');
        let products = [];
        // Backend first
        if (window.api) {
            try {
                const resp = await window.api.getJSON('/api/products');
                if (Array.isArray(resp)) {
                    products = resp.map(p => ({
                        id: p._id || p.id,
                        name: p.name,
                        price: Number(p.price)||0,
                        category: p.category||'',
                        brand: p.brand||'',
                        stock: Number(p.stock)||0,
                        status: p.status||'active',
                        featured: !!p.featured,
                        image: p.image || '../assets/images/placeholder-smartphone.jpg'
                    }));
                }
            } catch (_) { /* fallback below */ }
        }
        if (!products.length && window.dataManager) {
            products = window.dataManager.getProducts();
        }

        // Apply filters
        const q = (searchInput?.value || '').trim().toLowerCase();
        const status = statusFilter?.value || 'active';
        products = products.filter(p => {
            const matchesQuery = !q ||
                p.name.toLowerCase().includes(q) ||
                (p.brand||'').toLowerCase().includes(q) ||
                (p.category||'').toLowerCase().includes(q) ||
                (p.description||'').toLowerCase().includes(q);
            const matchesStatus = (status === 'all') || (String(p.status||'').toLowerCase() === status);
            return matchesQuery && matchesStatus;
        });

        container.innerHTML = '';

        // Update count badge
        if (countBadge) countBadge.textContent = `${products.length} product${products.length===1?'':'s'}`;

        if (!products.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = `
                <h4>No products found</h4>
                <p>Try adjusting your search or add a new product to get started.</p>
                <button class="btn btn-primary" id="emptyAddBtn"><i class="fas fa-plus"></i> Add Product</button>
            `;
            container.appendChild(empty);
            // Wire add button
            empty.querySelector('#emptyAddBtn')?.addEventListener('click', () => addProductBtn.click());
            return;
        }

        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <div class="product-image">
                    <img src="${product.image || '../assets/images/placeholder-smartphone.jpg'}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/200x150?text=Product'">
                </div>
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <p class="product-price">KSh ${product.price.toFixed(2)}</p>
                    <p class="product-stock">Stock: ${product.stock}</p>
                    <p class="product-status status-${product.status}">${(product.status||'active').toString()} ${product.featured ? '<span class="badge" style="margin-left:6px;background:#fde68a;color:#92400e;padding:2px 8px;border-radius:999px;font-size:12px;">Featured</span>' : ''}</p>
                </div>
                <div class="product-actions">
                    <button class="btn btn-sm btn-secondary edit-product" data-id="${product.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-product" data-id="${product.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(productCard);
        });
        
        // Add event listeners to action buttons
        container.querySelectorAll('.edit-product').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = this.getAttribute('data-id');
                editProduct(productId);
            });
        });
        
        container.querySelectorAll('.delete-product').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = this.getAttribute('data-id');
                deleteProduct(productId);
            });
        });
    }
    
    // Add product button
    addProductBtn.addEventListener('click', function() {
        editingProductId = null;
        document.getElementById('modalTitle').textContent = 'Add Product';
        productForm.reset();
        // Reset image preview
        const preview = document.getElementById('productImagePreview');
        if (preview) preview.src = '../assets/images/placeholder-smartphone.jpg';
        productModal.style.display = 'block';
    });
    
    // Close modal
    closeBtn.addEventListener('click', function() {
        productModal.style.display = 'none';
    });
    
    cancelBtn.addEventListener('click', function() {
        productModal.style.display = 'none';
    });
    
    // Helper to read a file as Data URL
    function readFileAsDataURL(file){
        return new Promise((resolve, reject)=>{
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Live preview handlers for image URL and file
    (function setupImagePreview(){
        const urlInput = document.getElementById('productImage');
        const fileInput = document.getElementById('productImageFile');
        const preview = document.getElementById('productImagePreview');
        if (!preview) return;
        if (urlInput){
            urlInput.addEventListener('input', ()=>{
                const v = (urlInput.value||'').trim();
                if (v) preview.src = v; else preview.src = '../assets/images/placeholder-smartphone.jpg';
            });
        }
        if (fileInput){
            fileInput.addEventListener('change', async ()=>{
                const f = fileInput.files && fileInput.files[0];
                if (f){
                    try { preview.src = await readFileAsDataURL(f);} catch(_){}
                }
            });
        }
    })();

    // Form submission
    productForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const fileInput = document.getElementById('productImageFile');
        const urlInput = document.getElementById('productImage');
        let imageValue = (urlInput.value || '').trim();

        // If a file is selected, use it instead of URL
        const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        if (file) {
            try {
                imageValue = await readFileAsDataURL(file);
            } catch(err) {
                console.warn('Failed to read file, falling back to URL if any.', err);
            }
        }
        if (!imageValue) {
            imageValue = '../assets/images/placeholder-smartphone.jpg';
        }

        const productData = {
            name: document.getElementById('productName').value,
            price: parseFloat(document.getElementById('productPrice').value),
            category: document.getElementById('productCategory').value,
            brand: document.getElementById('productBrand').value,
            stock: parseInt(document.getElementById('productStock').value),
            description: document.getElementById('productDescription').value,
            image: imageValue,
            featured: String(document.getElementById('productFeatured').value) === 'true'
        };

        const token = localStorage.getItem('adminToken') || '';
        let savedViaAPI = false;
        try {
            if (editingProductId) {
                const resp = await fetch(`/api/products/${encodeURIComponent(editingProductId)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...(token?{'x-admin-token':token}:{}) },
                    body: JSON.stringify(productData)
                });
                if (resp.ok) savedViaAPI = true;
            } else {
                const resp = await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(token?{'x-admin-token':token}:{}) },
                    body: JSON.stringify(productData)
                });
                if (resp.ok) savedViaAPI = true;
            }
        } catch (_) { /* fallback below */ }

        if (!savedViaAPI) {
            if (editingProductId && window.dataManager) {
                window.dataManager.updateProduct(editingProductId, productData);
            } else if (window.dataManager) {
                window.dataManager.addProduct(productData);
            }
        }

        productModal.style.display = 'none';
        renderProducts();
    });
    
    // Edit product
    function editProduct(productId) {
        const products = window.dataManager.getProducts();
        const product = products.find(p => p.id === productId);
        
        if (product) {
            editingProductId = productId;
            document.getElementById('modalTitle').textContent = 'Edit Product';
            document.getElementById('productName').value = product.name;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productCategory').value = product.category;
            document.getElementById('productBrand').value = product.brand;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productDescription').value = product.description || '';
            // Featured
            const featuredSel = document.getElementById('productFeatured');
            if (featuredSel) featuredSel.value = product.featured ? 'true' : 'false';
            // If image is a URL, prefill it; if data URL, leave field blank
            const isDataUrl = (product.image||'').startsWith('data:');
            document.getElementById('productImage').value = isDataUrl ? '' : (product.image || '');
            // Clear file input
            const fileInput = document.getElementById('productImageFile');
            if (fileInput) fileInput.value = '';
            // Set preview to current image
            const preview = document.getElementById('productImagePreview');
            if (preview) preview.src = product.image || '../assets/images/placeholder-smartphone.jpg';
            productModal.style.display = 'block';
        }
    }
    
    // Delete product
    async function deleteProduct(productId) {
        if (confirm('Are you sure you want to delete this product?')) {
            const token = localStorage.getItem('adminToken') || '';
            let deletedViaAPI = false;
            try {
                const resp = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
                    method: 'DELETE',
                    headers: token? { 'x-admin-token': token } : {}
                });
                if (resp.ok) deletedViaAPI = true;
            } catch (_) { /* fallback below */ }
            if (!deletedViaAPI && window.dataManager) {
                window.dataManager.deleteProduct(productId);
            }
            renderProducts();
        }
    }
    
    // Filters
    searchInput?.addEventListener('input', renderProducts);
    statusFilter?.addEventListener('change', renderProducts);

    // Initial render
    renderProducts();
}

// Load dashboard section (default)
function loadDashboardSection(contentArea) {
    contentArea.innerHTML = `
        <!-- Stats Overview -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <div class="stat-info">
                    <h3>0</h3>
                    <p>Total Orders</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-wrench"></i>
                </div>
                <div class="stat-info">
                    <h3>0</h3>
                    <p>Repair Requests</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-info">
                    <h3>0</h3>
                    <p>Registered Users</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="stat-info">
                    <h3>KSh 0.00</h3>
                    <p>Total Revenue</p>
                </div>
            </div>
        </div>
        
        <!-- Recent Orders -->
        <div class="content-section">
            <div class="section-header">
                <h2>Recent Orders</h2>
                <a href="#" class="view-all">View All</a>
            </div>
            
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Recent Repair Requests -->
        <div class="content-section">
            <div class="section-header">
                <h2>Recent Repair Requests</h2>
                <a href="#" class="view-all">View All</a>
            </div>
            
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Request ID</th>
                            <th>Customer</th>
                            <th>Device</th>
                            <th>Issue</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>#REP-1001</td>
                            <td>John Doe</td>
                            <td>iPhone 12</td>
                            <td>Screen Replacement</td>
                            <td><span class="status completed">Completed</span></td>
                            <td>
                                <button class="action-btn view"><i class="fas fa-eye"></i></button>
                                <button class="action-btn edit"><i class="fas fa-edit"></i></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Re-initialize dashboard functionality
    renderDashboardStats();
    renderCustomerOrders();
}

// Load other sections (placeholder implementations)
function loadOrdersSection(contentArea) {
    contentArea.innerHTML = `
        <div class="section-header">
            <h2>Orders Management</h2>
            <div>
                <input type="text" id="orderSearch" placeholder="Search by ID, name, email, phone" style="padding:8px;border:1px solid #d1d5db;border-radius:4px;width:280px;">
            </div>
        </div>
        <div class="table-container">
            <table class="data-table" id="ordersTable">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
        <!-- Order Details Modal -->
        <div id="orderModal" class="modal" style="display:none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="orderModalTitle">Order Details</h3>
                    <span class="close" id="orderModalClose" title="Close">&times;</span>
                </div>
                <div class="modal-body" id="orderModalBody" style="max-height:60vh;overflow:auto;">
                    Loading...
                </div>
            </div>
        </div>`;

    function renderOrdersTable() {
        if (!window.dataManager) return;
        const tbody = document.querySelector('#ordersTable tbody');
        const q = (document.getElementById('orderSearch')?.value || '').trim().toLowerCase();
        const orders = window.dataManager.getOrders()
            .filter(o => !q ||
                String(o.id||'').toLowerCase().includes(q) ||
                String(o?.customer?.name||'').toLowerCase().includes(q) ||
                String(o?.customer?.email||'').toLowerCase().includes(q) ||
                String(o?.customer?.phone||'').toLowerCase().includes(q)
            )
            .slice().reverse();

        tbody.innerHTML = '';
        if (!orders.length) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="6">No orders found</td>`;
            tbody.appendChild(tr);
            return;
        }

        orders.forEach(order => {
            const tr = document.createElement('tr');
            const dateStr = order.date ? new Date(order.date).toLocaleString() : '';
            tr.innerHTML = `
                <td>${order.id}</td>
                <td>${order?.customer?.name || ''}<br><small>${order?.customer?.email || ''}</small></td>
                <td>${dateStr}</td>
                <td>KSh ${Number(order.total||0).toFixed(2)}</td>
                <td>
                    <select class="order-status-select" data-id="${order.id}">
                        ${['pending','processing','paid','shipped','delivered','completed','cancelled','refunded'].map(s => `<option value="${s}" ${String(order.status||'').toLowerCase()===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <button class="action-btn view" data-id="${order.id}" title="View"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" data-act="cancel" data-id="${order.id}" title="Cancel"><i class="fas fa-ban"></i></button>
                    <button class="action-btn edit" data-act="refund" data-id="${order.id}" title="Refund"><i class="fas fa-rotate-left"></i></button>
                </td>`;
            tbody.appendChild(tr);
        });
    }

    // Wire events
    contentArea.addEventListener('change', async function(e){
        const sel = e.target.closest('.order-status-select');
        if (sel) {
            const id = sel.getAttribute('data-id');
            const val = sel.value;
            const token = localStorage.getItem('adminToken') || '';
            let updatedViaAPI = false;
            try {
                const resp = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...(token?{'x-admin-token':token}:{}) },
                    body: JSON.stringify({ status: val })
                });
                if (resp.ok) updatedViaAPI = true;
            } catch (_) { /* fallback below */ }
            if (!updatedViaAPI && window.dataManager) {
                window.dataManager.updateOrderStatus(id, val);
            }
            renderDashboardStats();
        }
    });
    // Prevent clicks on the select from bubbling to row/document handlers
    contentArea.addEventListener('click', function(e){
        if (e.target.closest('.order-status-select')) {
            e.stopPropagation();
        }
    });
    document.getElementById('orderSearch')?.addEventListener('input', function(){
        renderOrdersTable();
    });
    // View order details with audit
    contentArea.addEventListener('click', async function(e){
        const btn = e.target.closest('.action-btn.view');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        if (!id) return;
        const modal = document.getElementById('orderModal');
        const body = document.getElementById('orderModalBody');
        const title = document.getElementById('orderModalTitle');
        const close = document.getElementById('orderModalClose');
        const token = localStorage.getItem('adminToken') || '';
        let order = null;
        try {
            const resp = await fetch('/api/orders/'+encodeURIComponent(id), { headers: token? { 'x-admin-token': token } : {} });
            if (resp.ok) order = await resp.json();
        } catch(_){}
        if (!order && window.dataManager) {
            try {
                const list = window.dataManager.getOrders();
                order = list.find(o=> String(o.id)===String(id));
            } catch(_){}
        }
        if (!order) { alert('Order not found'); return; }
        title.textContent = `Order ${order._id || order.id || ''}`;
        const itemsHTML = Array.isArray(order.items) && order.items.length
            ? `<ul>${order.items.map(i=>`<li>${i.name||''} x${i.qty||1} - KSh ${(Number(i.price||0)*Number(i.qty||1)).toFixed(2)}</li>`).join('')}</ul>`
            : '<em>No items</em>';
        const audit = Array.isArray(order.audit) ? order.audit : [];
        const auditHTML = audit.length ? (`
            <h4 style="margin-top:12px;">Audit Trail</h4>
            <ul>${audit.map(a=>`<li><strong>${a.action}</strong> - ${a.note||''} <small>(${a.at? new Date(a.at).toLocaleString():''})</small></li>`).join('')}</ul>
        `) : '<em>No audit entries</em>';
        body.innerHTML = `
            <p><strong>Status:</strong> ${order.status || ''}</p>
            <p><strong>Total:</strong> KSh ${Number(order.total||0).toFixed(2)}</p>
            <p><strong>Customer:</strong> ${(order.customer?.firstName||order.customer?.name||'') + ' ' + (order.customer?.lastName||'')}</p>
            <p><strong>Contact:</strong> ${order.customer?.email||''} ${order.customer?.phone? ' | '+order.customer.phone:''}</p>
            <h4>Items</h4>
            ${itemsHTML}
            ${auditHTML}
        `;
        modal.style.display = 'block';
        close?.addEventListener('click', ()=> modal.style.display='none', { once: true });
        modal.addEventListener('click', (ev)=>{ if (ev.target===modal) modal.style.display='none'; }, { once: true });
    });
    // Cancel / Refund actions
    contentArea.addEventListener('click', async function(e){
        const btn = e.target.closest('.action-btn.edit');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const act = btn.getAttribute('data-act');
        if (!id || !act) return;
        const note = prompt(`Enter a note for ${act} (optional):`) || '';
        const token = localStorage.getItem('adminToken') || '';
        try {
            const resp = await fetch(`/api/orders/${encodeURIComponent(id)}/${act}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token?{'x-admin-token':token}:{}) },
                body: JSON.stringify({ note })
            });
            if (!resp.ok) throw new Error('HTTP '+resp.status);
            await resp.json();
            renderOrdersTable();
            renderDashboardStats();
        } catch (_) {
            alert('Action not completed; ensure backend is running.');
        }
    });

    window.addEventListener('dataChanged', function(evt){
        if (evt?.detail?.type === 'orders') {
            renderOrdersTable();
            renderDashboardStats();
        }
    });

    renderOrdersTable();
}

function loadBookingsSection(contentArea) {
    contentArea.innerHTML = `
        <div class="section-header">
            <h2>Bookings Management</h2>
            <div>
                <input type="text" id="bookingSearch" placeholder="Search by ID, name, email, phone" style="padding:8px;border:1px solid #d1d5db;border-radius:4px;width:280px;">
            </div>
        </div>
        <div class="table-container">
            <table class="data-table" id="bookingsTable">
                <thead>
                    <tr>
                        <th>Booking ID</th>
                        <th>Customer</th>
                        <th>Device</th>
                        <th>Issue</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>`;

    // Booking details modal
    let bookingModal = null;
    function ensureBookingModal(){
        if (bookingModal) return bookingModal;
        bookingModal = document.createElement('div');
        bookingModal.id = 'bookingModal';
        bookingModal.className = 'modal';
        bookingModal.style.display = 'none';
        bookingModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Booking Details</h3>
                    <span class="close" id="bookingModalClose" title="Close">&times;</span>
                </div>
                <div class="modal-body" id="bookingModalBody" style="max-height:60vh;overflow:auto;">Loading...</div>
            </div>`;
        document.body.appendChild(bookingModal);
        bookingModal.querySelector('#bookingModalClose')?.addEventListener('click', ()=> bookingModal.style.display='none');
        return bookingModal;
    }

    async function renderBookingsTable() {
        const tbody = document.querySelector('#bookingsTable tbody');
        const q = (document.getElementById('bookingSearch')?.value || '').trim().toLowerCase();
        let bookings = [];
        // Backend first (admin: all bookings)
        if (window.api) {
            try {
                const token = localStorage.getItem('adminToken') || '';
                const resp = await fetch('/api/bookings', { headers: token? { 'x-admin-token': token } : {} });
                if (resp.ok) {
                    const data = await resp.json();
                    if (Array.isArray(data)) bookings = data;
                }
            } catch(_) { /* fallback below */ }
        }
        if (!bookings.length && window.dataManager) {
            bookings = window.dataManager.getBookings();
        }
        bookings = bookings
            .filter(b => !q ||
                String(b.id||'').toLowerCase().includes(q) ||
                String(b?.customer?.name||'').toLowerCase().includes(q) ||
                String(b?.customer?.email||'').toLowerCase().includes(q) ||
                String(b?.customer?.phone||'').toLowerCase().includes(q) ||
                String(b?.device?.model||'').toLowerCase().includes(q) ||
                String(b?.issue?.type||'').toLowerCase().includes(q)
            )
            .slice().reverse();

        tbody.innerHTML = '';
        if (!bookings.length) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="7">No bookings found</td>`;
            tbody.appendChild(tr);
            return;
        }

        bookings.forEach(b => {
            const dateStr = b.createdAt ? new Date(b.createdAt).toLocaleString() : '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${b.id}</td>
                <td>${b?.customer?.name || ''}<br><small>${b?.customer?.email || ''}</small></td>
                <td>${b?.device?.brand || ''} ${b?.device?.model || ''}</td>
                <td>${b?.issue?.type || ''}</td>
                <td>${dateStr}</td>
                <td>
                    <select class="booking-status-select" data-id="${b.id}">
                        ${['pending','diagnostic','in-progress','completed','cancelled','scheduled'].map(s => `<option value="${s}" ${String(b.status||'').toLowerCase()===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
                    </select>
                    <div style="font-size:12px;color:#6b7280;margin-top:4px;">
                        Quote: ${b.quoteStatus||'none'}${b.quoteAmount? ` (KSh ${Number(b.quoteAmount).toFixed(2)})` : ''}
                    </div>
                </td>
                <td>
                    <button class="action-btn view" data-id="${b.id}" title="View"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" data-act="quote" data-id="${b.id}" title="Propose Quote"><i class="fas fa-money-bill"></i></button>
                </td>`;
            tbody.appendChild(tr);
        });
    }

    // Wire events
    contentArea.addEventListener('change', function(e){
        const sel = e.target.closest('.booking-status-select');
        if (sel && window.dataManager) {
            const id = sel.getAttribute('data-id');
            const val = sel.value;
            window.dataManager.updateBookingStatus(id, val);
            renderDashboardStats();
        }
    });
    contentArea.addEventListener('click', function(e){
        if (e.target.closest('.booking-status-select')) {
            e.stopPropagation();
        }
    });
    document.getElementById('bookingSearch')?.addEventListener('input', function(){
        renderBookingsTable();
    });
    window.addEventListener('dataChanged', function(evt){
        if (evt?.detail?.type === 'bookings') {
            renderBookingsTable();
            renderDashboardStats();
        }
    });
    // Auto-refresh bookings when window gains focus
    window.addEventListener('focus', function(){
        renderBookingsTable();
    });
    // Lightweight periodic refresh every 60s
    try {
        setInterval(function(){
            renderBookingsTable();
        }, 60000);
    } catch(_) { /* ignore */ }

    // View booking details
    contentArea.addEventListener('click', async function(e){
        const btn = e.target.closest('.action-btn.view');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        if (!id) return;
        let booking = null;
        const token = localStorage.getItem('adminToken') || '';
        try {
            const resp = await fetch('/api/bookings/'+encodeURIComponent(id), { headers: token? { 'x-admin-token': token } : {} });
            if (resp.ok) booking = await resp.json();
        } catch(_){ }
        if (!booking && window.dataManager) {
            try { booking = window.dataManager.getBookings().find(b=> String(b.id)===String(id)); } catch(_){}
        }
        if (!booking) return alert('Booking not found');
        const m = ensureBookingModal();
        const body = document.getElementById('bookingModalBody');
        const cust = booking.customer||{};
        const device = booking.device||{};
        const issue = booking.issue||{};
        body.innerHTML = `
            <p><strong>ID:</strong> ${booking._id || booking.id || ''}</p>
            <p><strong>Customer:</strong> ${(cust.firstName||'')+' '+(cust.lastName||'')} (${cust.email||''}${cust.phone? ' | '+cust.phone:''})</p>
            <p><strong>Device:</strong> ${(device.brand||'')+' '+(device.model||'')}</p>
            <p><strong>Issue:</strong> ${issue.type||''}</p>
            <p><strong>Status:</strong> ${booking.status||''}</p>
            <p><strong>Date:</strong> ${booking.createdAt? new Date(booking.createdAt).toLocaleString():''}</p>
        `;
        m.style.display = 'block';
    });

    // Propose a quote
    contentArea.addEventListener('click', async function(e){
        const btn = e.target.closest('button[data-act="quote"]');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const amountStr = prompt('Enter quote amount (KSh):');
        if (!amountStr) return;
        const amount = parseFloat(amountStr);
        if (!isFinite(amount) || amount <= 0) return alert('Invalid amount');
        const note = prompt('Optional note for the customer (e.g., parts and labor):') || '';
        const token = localStorage.getItem('adminToken') || '';
        let ok = false;
        try {
            const resp = await fetch('/api/bookings/'+encodeURIComponent(id)+'/quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token?{'x-admin-token':token}:{}) },
                body: JSON.stringify({ amount, note })
            });
            ok = resp.ok;
        } catch(_){}
        if (!ok) {
            // Fallback: store quote in local cache if your dataManager supports it
            try { window.dataManager?.setBookingQuote?.(id, { amount, note, status: 'proposed' }); ok = true; } catch(_){ }
        }
        if (ok) {
            renderBookingsTable();
            renderDashboardStats();
        } else {
            alert('Failed to propose quote. Ensure backend is running and admin token is set.');
        }
    });

    renderBookingsTable();
}

function loadCustomersSection(contentArea) {
    contentArea.innerHTML = `
        <div class="section-header">
            <h2>Customers Management</h2>
            <div>
                <input type="text" id="customerSearch" placeholder="Search name, email, phone" style="padding:8px;border:1px solid #d1d5db;border-radius:4px;width:280px;">
                <button class="btn btn-primary" id="createVoucherBtn"><i class="fas fa-ticket"></i> Create Voucher</button>
            </div>
        </div>
        <div class="table-container">
            <table class="data-table" id="customersTable">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Vouchers</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    function renderCustomers() {
        if (!window.dataManager) return;
        const tbody = document.querySelector('#customersTable tbody');
        const q = (document.getElementById('customerSearch')?.value || '').trim().toLowerCase();
        const customers = window.dataManager.getCustomers()
            .filter(c => !q ||
                String(c.firstName||'').toLowerCase().includes(q) ||
                String(c.lastName||'').toLowerCase().includes(q) ||
                String(c.email||'').toLowerCase().includes(q) ||
                String(c.phone||'').toLowerCase().includes(q)
            )
            .slice().reverse();
        tbody.innerHTML = '';
        if (!customers.length) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="5">No customers found</td>`;
            tbody.appendChild(tr);
            return;
        }
        customers.forEach(c => {
            const vouchers = (window.dataManager.getVouchersForCustomer?.(c) || []).filter(v => !v.used);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${(c.firstName||'') + ' ' + (c.lastName||'')}</td>
                <td>${c.email||''}</td>
                <td>${c.phone||''}</td>
                <td>${vouchers.map(v=>`${v.code} (KSh ${Number(v.amount||0).toFixed(2)})`).join(', ') || 'None'}</td>
                <td>
                    <button class="btn btn-sm btn-primary assign-voucher" data-email="${c.email||''}" data-phone="${c.phone||''}"><i class="fas fa-plus"></i> Assign Voucher</button>
                </td>`;
            tbody.appendChild(tr);
        });
    }

    // Events
    document.getElementById('customerSearch')?.addEventListener('input', renderCustomers);
    document.getElementById('createVoucherBtn')?.addEventListener('click', async function(){
        const code = prompt('Enter voucher code (e.g., SAVE200):');
        if (!code) return;
        const amount = parseFloat(prompt('Enter voucher amount (KSh):')||'0');
        if (isNaN(amount) || amount <= 0) return alert('Invalid amount');
        // Try backend first
        const token = localStorage.getItem('adminToken') || '';
        let ok = false;
        try {
            const resp = await fetch('/api/vouchers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token?{'x-admin-token':token}:{}) },
                body: JSON.stringify({ code, amount })
            });
            ok = resp.ok;
        } catch (_) { /* ignore */ }
        if (!ok && window.dataManager?.createVoucher) {
            window.dataManager.createVoucher({ code, amount });
        }
        alert('Voucher created. Assign it to a customer.');
    });
    contentArea.addEventListener('click', function(e){
        const btn = e.target.closest('.assign-voucher');
        if (!btn) return;
        const email = btn.getAttribute('data-email')||'';
        const phone = btn.getAttribute('data-phone')||'';
        const code = prompt('Enter existing voucher code to assign:');
        if (!code) return;
        if (window.dataManager?.assignVoucherToCustomer) {
            window.dataManager.assignVoucherToCustomer({ email, phone }, code);
            alert('Voucher assigned');
            renderCustomers();
        }
    });
    window.addEventListener('dataChanged', function(evt){
        if (['customers','vouchers'].includes(evt?.detail?.type)) renderCustomers();
    });
    renderCustomers();
}

// Discounts / Vouchers management
function loadDiscountsSection(contentArea) {
    contentArea.innerHTML = `
        <div class="section-header">
            <h2>Discounts & Vouchers</h2>
            <div>
                <select id="voucherStatusFilter" style="padding:8px;border:1px solid #d1d5db;border-radius:4px;">
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="used">Used</option>
                </select>
                <select id="voucherAssignFilter" style="padding:8px;border:1px solid #d1d5db;border-radius:4px;">
                    <option value="all">All</option>
                    <option value="assigned">Assigned</option>
                    <option value="unassigned">Unassigned</option>
                </select>
                <button class="btn btn-primary" id="newVoucherBtn"><i class="fas fa-ticket"></i> New Voucher</button>
            </div>
        </div>
        <div class="table-container">
            <table class="data-table" id="vouchersTable">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Amount</th>
                        <th>Assigned To</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>`;

    async function fetchVouchersList() {
        const token = localStorage.getItem('adminToken') || '';
        try {
            const resp = await fetch('/api/vouchers', { headers: token? { 'x-admin-token': token } : {} });
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data)) return data;
            }
        } catch (_) { /* fallback */ }
        return (window.dataManager?.getVouchers?.() || []).slice();
    }

    async function renderVouchers() {
        const tbody = document.querySelector('#vouchersTable tbody');
        let list = (await fetchVouchersList()).slice().reverse();
        const statusF = document.getElementById('voucherStatusFilter')?.value || 'all';
        const assignF = document.getElementById('voucherAssignFilter')?.value || 'all';
        list = list.filter(v => {
            const isUsed = !!v.used;
            const isAssigned = !!(v.assignedTo && (v.assignedTo.email || v.assignedTo.phone));
            const statusOk = (statusF==='all') || (statusF==='active' && !isUsed) || (statusF==='used' && isUsed);
            const assignOk = (assignF==='all') || (assignF==='assigned' && isAssigned) || (assignF==='unassigned' && !isAssigned);
            return statusOk && assignOk;
        });
        tbody.innerHTML = '';
        if (!list.length) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="5">No vouchers yet</td>`;
            tbody.appendChild(tr);
            return;
        }
        list.forEach(v => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${v.code}</td>
                <td>KSh ${Number(v.amount||0).toFixed(2)}</td>
                <td>${v.assignedTo?.email || v.assignedTo?.phone || 'Unassigned'}</td>
                <td>${v.used ? 'Used' : 'Active'}</td>
                <td>
                    ${v.used ? '' : '<button class="btn btn-sm btn-secondary" data-act="assign" data-code="'+v.code+'">Assign</button>'}
                    <button class="btn btn-sm btn-danger" data-act="delete" data-code="${v.code}">Delete</button>
                </td>`;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('newVoucherBtn')?.addEventListener('click', async function(){
        const code = prompt('Enter voucher code:');
        if (!code) return;
        const amount = parseFloat(prompt('Amount (KSh):')||'0');
        if (!amount || amount <= 0) return alert('Invalid amount');
        const token = localStorage.getItem('adminToken') || '';
        let ok = false;
        try {
            const resp = await fetch('/api/vouchers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token?{'x-admin-token':token}:{}) },
                body: JSON.stringify({ code, amount })
            });
            ok = resp.ok;
        } catch(_){}
        if (!ok) {
            window.dataManager?.createVoucher?.({ code, amount });
        }
        renderVouchers();
    });

    contentArea.addEventListener('click', async function(e){
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const act = btn.getAttribute('data-act');
        const code = btn.getAttribute('data-code');
        if (act === 'assign') {
            const ident = prompt('Assign to customer email or phone:');
            if (!ident) return;
            const token = localStorage.getItem('adminToken') || '';
            let ok = false;
            try {
                const resp = await fetch('/api/vouchers/assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(token?{'x-admin-token':token}:{}) },
                    body: JSON.stringify({ code, email: /@/.test(ident)? ident:'', phone: /@/.test(ident)? '': ident })
                });
                ok = resp.ok;
            } catch(_){}
            if (!ok) {
                window.dataManager?.assignVoucherToIdent?.(ident, code);
            }
            renderVouchers();
        } else if (act === 'delete') {
            if (confirm('Delete voucher '+code+'?')) {
                const token = localStorage.getItem('adminToken') || '';
                let ok = false;
                try {
                    const resp = await fetch('/api/vouchers/'+encodeURIComponent(code), {
                        method: 'DELETE',
                        headers: token? { 'x-admin-token': token } : {}
                    });
                    ok = resp.ok;
                } catch(_){}
                if (!ok) {
                    window.dataManager?.deleteVoucher?.(code);
                }
                renderVouchers();
            }
        }
    });

    document.getElementById('voucherStatusFilter')?.addEventListener('change', renderVouchers);
    document.getElementById('voucherAssignFilter')?.addEventListener('change', renderVouchers);
    window.addEventListener('dataChanged', function(evt){
        if (evt?.detail?.type === 'vouchers') renderVouchers();
    });
    renderVouchers();
}

function loadSettingsSection(contentArea) {
    const currentTheme = (localStorage.getItem('adminTheme')||'light');
    contentArea.innerHTML = `
        <div class="section-header"><h2>Settings</h2></div>
        <div class="content-section">
            <div class="form-group">
                <label for="themeToggle">Theme</label>
                <select id="themeToggle">
                    <option value="light" ${currentTheme==='light'?'selected':''}>Light</option>
                    <option value="dark" ${currentTheme==='dark'?'selected':''}>Dark</option>
                </select>
            </div>
        </div>`;
    const sel = document.getElementById('themeToggle');
    sel?.addEventListener('change', function(){
        const val = sel.value === 'dark' ? 'dark' : 'light';
        localStorage.setItem('adminTheme', val);
        applyAdminTheme();
    });
}

function applyAdminTheme() {
    const val = (localStorage.getItem('adminTheme')||'light');
    document.body.classList.toggle('theme-dark', val === 'dark');
}

// Apply theme immediately on load
applyAdminTheme();