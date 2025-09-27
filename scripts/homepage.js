// Homepage specific functionality
document.addEventListener('DOMContentLoaded', function() {
    // Featured products slider
    const initProductSlider = () => {
        const productGrid = document.querySelector('.product-grid');
        if (productGrid && window.innerWidth < 768) {
            productGrid.classList.add('product-slider');
            // Add slider functionality here
        }
    };
    
    // Fetch featured products from backend and render into Featured section
    async function fetchFeaturedProducts(){
        try {
            if (window.api && typeof window.api.getJSON === 'function') {
                const items = await window.api.getJSON('/api/products?status=active&featured=true&limit=8');
                if (Array.isArray(items)) return items;
            } else {
                const resp = await fetch('/api/products?status=active&featured=true&limit=8');
                if (resp.ok) {
                    const data = await resp.json();
                    if (Array.isArray(data)) return data;
                }
            }
        } catch(_) {}
        return [];
    }
    function renderFeatured(products){
        const grid = document.querySelector('.featured-products .product-grid');
        if (!grid) return;
        grid.innerHTML = '';
        if (!products.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No featured products yet.';
            grid.appendChild(empty);
            return;
        }
        products.forEach(p => {
            const stockNum = Number(p.stock)||0;
            const out = stockNum <= 0;
            const id = p._id || p.id || '';
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-img">
                    <img src="${p.image||'assets/images/placeholder-smartphone.jpg'}" alt="${p.name||''}" onerror="this.src='https://via.placeholder.com/250x200?text=Product'">
                </div>
                <div class="product-content">
                    <h3 class="product-title">${p.name||''}</h3>
                    <div class="product-price">KSh ${(Number(p.price)||0).toFixed(2)}</div>
                    <div class="product-actions">
                        <a href="pages/product-detail.html?id=${encodeURIComponent(id)}" class="btn">Details</a>
                        <a href="#" class="btn btn-accent btn-add-to-cart ${out?'disabled':''}" data-id="${id}" ${out?'aria-disabled="true" tabindex="-1"':''}>${out?'Out of Stock':'Add to Cart'}</a>
                    </div>
                </div>`;
            grid.appendChild(card);
        });
        if (typeof initializeCart === 'function') {
            initializeCart();
        }
    }
    fetchFeaturedProducts().then(renderFeatured);
    
    // Testimonial rotation
    const testimonials = document.querySelectorAll('.testimonial-card');
    if (testimonials.length > 0) {
        let currentTestimonial = 0;
        
        function showTestimonial(index) {
            testimonials.forEach((testimonial, i) => {
                testimonial.style.display = i === index ? 'block' : 'none';
            });
        }
        
        // Auto-rotate testimonials
        setInterval(() => {
            currentTestimonial = (currentTestimonial + 1) % testimonials.length;
            showTestimonial(currentTestimonial);
        }, 5000);
    }
});