document.addEventListener('DOMContentLoaded', function() {
    // Load data manager
    const script = document.createElement('script');
    script.src = '../scripts/data-manager.js';
    document.head.appendChild(script);
    
    // Wait for data manager to load
    script.onload = function() {
        initializeProducts();
    };
    
    // Price range slider
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    
    if (priceRange && priceValue) {
        priceRange.addEventListener('input', function() {
            priceValue.textContent = 'KSh ' + this.value;
        });
    }
    
    // Products will be loaded from data manager
    let products = [];
    
    // Render products
    function renderProducts(productsToRender) {
        const productsList = document.querySelector('.products-list');
        if (!productsList) return;
        
        productsList.innerHTML = '';
        
        productsToRender.forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = 'product-item';
            const stockNum = Number(product.stock)||0;
            const outOfStock = stockNum <= 0;
            productItem.innerHTML = `
                <div class="product-item-img">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/250x200?text=Product'">
                </div>
                <div class="product-item-content">
                    <h3 class="product-item-title">${product.name}</h3>
                    <div class="product-item-price">KSh ${product.price.toFixed(2)}</div>
                    <div class="product-item-stock">
                        <span class="badge ${outOfStock?'badge-danger':'badge-success'}">${outOfStock?'Out of Stock':'In Stock: '+stockNum}</span>
                    </div>
                    <div class="product-item-actions">
                        <a href="product-detail.html?id=${product.id}" class="btn">Details</a>
                        <a href="#" class="btn btn-accent btn-add-to-cart ${outOfStock?'disabled':''}" data-id="${product.id}" ${outOfStock?'aria-disabled="true" tabindex="-1"':''}>${outOfStock?'Out of Stock':'Add to Cart'}</a>
                    </div>
                </div>
            `;
            
            productsList.appendChild(productItem);
        });
        
        // Reinitialize cart functionality for new buttons
        if (typeof initializeCart === 'function') {
            initializeCart();
        }
    }
    
    // Filter products
    function filterProducts() {
        if (!window.dataManager) return;
        
        const categoryFilters = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(input => input.value);
        const brandFilters = Array.from(document.querySelectorAll('input[name="brand"]:checked')).map(input => input.value);
        const maxPrice = parseInt(priceRange.value);
        
        const filters = {
            category: categoryFilters,
            brand: brandFilters,
            maxPrice: maxPrice
        };
        
        const filteredProducts = window.dataManager.filterProducts(filters);
        renderProducts(filteredProducts);
        
        // Update product count
        const productCount = document.querySelector('.products-header p');
        if (productCount) {
            productCount.textContent = `Showing ${filteredProducts.length} products`;
        }
    }
    
    // Apply filters button
    const applyFiltersBtn = document.querySelector('.apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', filterProducts);
    }
    
    // Reset filters button
    const resetFiltersBtn = document.querySelector('.reset-filters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', function() {
            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            priceRange.value = 5000;
            priceValue.textContent = 'KSh 5000';
            
            if (window.dataManager) {
                const allProducts = window.dataManager.getActiveProducts();
                renderProducts(allProducts);
                
                // Update product count
                const productCount = document.querySelector('.products-header p');
                if (productCount) {
                    productCount.textContent = `Showing ${allProducts.length} products`;
                }
            }
        });
    }
    
    // Sort products
    const sortSelect = document.getElementById('sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            if (!window.dataManager) return;
            
            const sortValue = this.value;
            const currentProducts = window.dataManager.getActiveProducts();
            const sortedProducts = window.dataManager.sortProducts(currentProducts, sortValue);
            
            renderProducts(sortedProducts);
        });
    }
    
    // Initialize products functionality
    function initializeProducts() {
        if (window.dataManager) {
            products = window.dataManager.getActiveProducts();
            renderProducts(products);
            
            // Listen for product changes from admin
            window.addEventListener('dataChanged', function(event) {
                if (event.detail.type === 'products') {
                    products = window.dataManager.getActiveProducts();
                    renderProducts(products);
                    
                    // Update product count
                    const productCount = document.querySelector('.products-header p');
                    if (productCount) {
                        productCount.textContent = `Showing ${products.length} products`;
                    }
                }
            });
        }
    }
    
    // Fallback: try to initialize immediately if data manager is already loaded
    if (window.dataManager) {
        initializeProducts();
    } else {
        // Initial render with empty products if data manager not loaded yet
        renderProducts([]);
    }
});