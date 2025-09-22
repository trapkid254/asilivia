document.addEventListener('DOMContentLoaded', function() {
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
        if (row && !e.target.closest('.action-btn') && !row.closest('thead')) {
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
                    <div class="form-group">
                        <label for="productName">Product Name</label>
                        <input type="text" id="productName" required>
                    </div>
                    <div class="form-group">
                        <label for="productPrice">Price (KSh)</label>
                        <input type="number" id="productPrice" step="0.01" required>
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
                        <input type="number" id="productStock" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="productDescription">Description</label>
                        <textarea id="productDescription" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="productImage">Image URL</label>
                        <input type="url" id="productImage" placeholder="https://example.com/image.jpg">
                    </div>
                    <div class="form-group">
                        <label for="productImageFile">Upload Image</label>
                        <input type="file" id="productImageFile" accept="image/*">
                        <small>Optional. If you upload a file, it will be used instead of the URL.</small>
                    </div>
                    <div class="form-group">
                        <label>Preview</label>
                        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;display:flex;align-items:center;justify-content:center;height:140px;background:#fafafa;">
                            <img id="productImagePreview" src="../assets/images/placeholder-smartphone.jpg" alt="Preview" style="max-height:100%;max-width:100%;object-fit:contain;">
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
    
    // Initialize products management
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
    function renderProducts() {
        const container = document.getElementById('productsContainer');
        let products = window.dataManager.getProducts();

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
                    <p class="product-status status-${product.status}">${(product.status||'active').toString()}</p>
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
            image: imageValue
        };

        if (editingProductId) {
            window.dataManager.updateProduct(editingProductId, productData);
        } else {
            window.dataManager.addProduct(productData);
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
    function deleteProduct(productId) {
        if (confirm('Are you sure you want to delete this product?')) {
            window.dataManager.deleteProduct(productId);
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
                        ${['pending','processing','shipped','delivered','cancelled'].map(s => `<option value="${s}" ${String(order.status||'').toLowerCase()===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <button class="action-btn view" data-id="${order.id}" title="View"><i class="fas fa-eye"></i></button>
                </td>`;
            tbody.appendChild(tr);
        });
    }

    // Wire events
    contentArea.addEventListener('change', function(e){
        const sel = e.target.closest('.order-status-select');
        if (sel && window.dataManager) {
            const id = sel.getAttribute('data-id');
            const val = sel.value;
            window.dataManager.updateOrderStatus(id, val);
            renderDashboardStats();
        }
    });
    document.getElementById('orderSearch')?.addEventListener('input', function(){
        renderOrdersTable();
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

    function renderBookingsTable() {
        if (!window.dataManager) return;
        const tbody = document.querySelector('#bookingsTable tbody');
        const q = (document.getElementById('bookingSearch')?.value || '').trim().toLowerCase();
        const bookings = window.dataManager.getBookings()
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
                </td>
                <td>
                    <button class="action-btn view" data-id="${b.id}" title="View"><i class="fas fa-eye"></i></button>
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
    document.getElementById('bookingSearch')?.addEventListener('input', function(){
        renderBookingsTable();
    });
    window.addEventListener('dataChanged', function(evt){
        if (evt?.detail?.type === 'bookings') {
            renderBookingsTable();
            renderDashboardStats();
        }
    });

    renderBookingsTable();
}

function loadCustomersSection(contentArea) {
    contentArea.innerHTML = '<h2>Customers Management - Coming Soon</h2>';
}

function loadServicesSection(contentArea) {
    contentArea.innerHTML = '<h2>Services Management - Coming Soon</h2>';
}