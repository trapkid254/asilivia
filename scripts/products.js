document.addEventListener('DOMContentLoaded', function() {
    // Price range slider
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    
    if (priceRange && priceValue) {
        priceRange.addEventListener('input', function() {
            priceValue.textContent = 'KSh ' + this.value;
        });
    }
    
    // Sample product data
    const products = [
        {
            id: 1,
            name: "Premium Smartphone XYZ",
            price: 899.99,
            category: "mobiles",
            brand: "apple",
            image: "../assets/images/placeholder-smartphone.jpg"
        },
        {
            id: 2,
            name: "Ultrabook Pro 2023",
            price: 1299.99,
            category: "laptops",
            brand: "dell",
            image: "../assets/images/placeholder-laptop.jpg"
        },
        {
            id: 3,
            name: "Wireless Noise-Cancelling Headphones",
            price: 249.99,
            category: "accessories",
            brand: "sony",
            image: "../assets/images/placeholder-headphones.jpg"
        },
        {
            id: 4,
            name: "Smart Fitness Tracker",
            price: 199.99,
            category: "accessories",
            brand: "samsung",
            image: "../assets/images/placeholder-smartwatch.jpg"
        },
        {
            id: 5,
            name: "Gaming Laptop Extreme",
            price: 1899.99,
            category: "laptops",
            brand: "hp",
            image: "../assets/images/placeholder-laptop.jpg"
        },
        {
            id: 6,
            name: "Flagship Smartphone Pro",
            price: 1099.99,
            category: "mobiles",
            brand: "samsung",
            image: "../assets/images/placeholder-smartphone.jpg"
        }
    ];
    
    // Render products
    function renderProducts(productsToRender) {
        const productsList = document.querySelector('.products-list');
        if (!productsList) return;
        
        productsList.innerHTML = '';
        
        productsToRender.forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = 'product-item';
            productItem.innerHTML = `
                <div class="product-item-img">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/250x200?text=Product'">
                </div>
                <div class="product-item-content">
                    <h3 class="product-item-title">${product.name}</h3>
                    <div class="product-item-price">KSh ${product.price.toFixed(2)}</div>
                    <div class="product-item-actions">
                        <a href="product-detail.html?id=${product.id}" class="btn">Details</a>
                        <a href="#" class="btn btn-accent btn-add-to-cart" data-id="${product.id}">Add to Cart</a>
                    </div>
                </div>
            `;
            
            productsList.appendChild(productItem);
        });
        
        // Reinitialize cart functionality for new buttons
        initializeCart();
    }
    
    // Filter products
    function filterProducts() {
        const categoryFilters = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(input => input.value);
        const brandFilters = Array.from(document.querySelectorAll('input[name="brand"]:checked')).map(input => input.value);
        const maxPrice = parseInt(priceRange.value);
        
        const filteredProducts = products.filter(product => {
            const categoryMatch = categoryFilters.length === 0 || categoryFilters.includes(product.category);
            const brandMatch = brandFilters.length === 0 || brandFilters.includes(product.brand);
            const priceMatch = product.price <= maxPrice;
            
            return categoryMatch && brandMatch && priceMatch;
        });
        
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
            
            renderProducts(products);
            
            // Update product count
            const productCount = document.querySelector('.products-header p');
            if (productCount) {
                productCount.textContent = `Showing ${products.length} products`;
            }
        });
    }
    
    // Sort products
    const sortSelect = document.getElementById('sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            const sortValue = this.value;
            let sortedProducts = [...products];
            
            switch(sortValue) {
                case 'price-low':
                    sortedProducts.sort((a, b) => a.price - b.price);
                    break;
                case 'price-high':
                    sortedProducts.sort((a, b) => b.price - a.price);
                    break;
                case 'name':
                    sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                default:
                    // Default sorting (featured)
                    break;
            }
            
            renderProducts(sortedProducts);
        });
    }
    
    // Initial render
    renderProducts(products);
});