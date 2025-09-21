document.addEventListener('DOMContentLoaded', function() {
    // Helper fallbacks if main.js helpers are not present
    function _getCart() {
        try {
            const raw = localStorage.getItem('cart');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }
    function _setCart(c) { localStorage.setItem('cart', JSON.stringify(c)); }

    const getCart = (typeof window.getCart === 'function') ? window.getCart : _getCart;
    const setCart = (typeof window.setCart === 'function') ? window.setCart : _setCart;
    const updateHeaderCartCount = (typeof window.updateHeaderCartCount === 'function') ? window.updateHeaderCartCount : function(){
        const el = document.querySelector('.cart-count');
        const count = getCart().reduce((s, it) => s + (parseInt(it.qty)||0), 0);
        if (el) el.textContent = String(Math.max(0, count));
        localStorage.setItem('cartCount', Math.max(0, count));
    };

    // Render cart items from storage
    function renderCartItems() {
        const container = document.querySelector('.cart-items');
        const emptyMsg = document.querySelector('.cart-empty');
        if (!container) return;
        const cart = getCart();
        container.innerHTML = '';
        if (!cart.length) {
            if (emptyMsg) emptyMsg.style.display = 'block';
            updateCartSummary();
            return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';
        cart.forEach(item => {
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.setAttribute('data-id', item.id);
            div.innerHTML = `
                <div class="item-image">
                    <img src="${item.image || '../assets/images/placeholder-smartphone.jpg'}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/100x100?text=Product'">
                </div>
                <div class="item-details">
                    <h3 class="item-title">${item.name}</h3>
                    <p class="item-price">KSh ${Number(item.price).toFixed(2)}</p>
                </div>
                <div class="item-quantity">
                    <button class="quantity-btn minus">-</button>
                    <input type="number" value="${Math.max(1, parseInt(item.qty)||1)}" min="1" class="quantity-input">
                    <button class="quantity-btn plus">+</button>
                </div>
                <div class="item-total">KSh ${(Number(item.price) * Math.max(1, parseInt(item.qty)||1)).toFixed(2)}</div>
                <div class="item-remove">
                    <button class="remove-btn"><i class="fas fa-trash"></i></button>
                </div>`;
            container.appendChild(div);
        });
        updateHeaderCartCount();
        updateCartSummary();
    }

    // Initialize header count and render items before wiring events
    updateHeaderCartCount();
    renderCartItems();

    // Quantity buttons (query after render)
    let quantityButtons = document.querySelectorAll('.quantity-btn');
    let quantityInputs = document.querySelectorAll('.quantity-input');
    let removeButtons = document.querySelectorAll('.remove-btn');
    
    // Update quantity
    quantityButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('.quantity-input');
            let value = parseInt(input.value);
            
            if (this.classList.contains('minus')) {
                if (value > 1) {
                    input.value = value - 1;
                }
            } else if (this.classList.contains('plus')) {
                input.value = value + 1;
            }
            
            // Update UI total
            updateItemTotal(input);
            // Persist to storage
            const cartItem = input.closest('.cart-item');
            const id = cartItem ? cartItem.getAttribute('data-id') : null;
            if (id) {
                const cart = getCart();
                const it = cart.find(x => x.id === id);
                if (it) {
                    it.qty = Math.max(1, parseInt(input.value) || 1);
                    setCart(cart);
                    updateHeaderCartCount();
                }
            }
            updateCartSummary();
        });
    });
    
    // Input change
    quantityInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.value < 1) this.value = 1;
            updateItemTotal(this);
            // Persist to storage
            const cartItem = this.closest('.cart-item');
            const id = cartItem ? cartItem.getAttribute('data-id') : null;
            if (id) {
                const cart = getCart();
                const it = cart.find(x => x.id === id);
                if (it) {
                    it.qty = Math.max(1, parseInt(this.value) || 1);
                    setCart(cart);
                    updateHeaderCartCount();
                }
            }
            updateCartSummary();
        });
    });
    
    // Remove item
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const cartItem = this.closest('.cart-item');
            cartItem.style.opacity = '0';
            
            setTimeout(() => {
                // Remove from storage
                const id = cartItem ? cartItem.getAttribute('data-id') : null;
                if (id) {
                    const cart = getCart().filter(x => x.id !== id);
                    setCart(cart);
                }
                cartItem.remove();
                updateCartSummary();
                
                // Update cart count
                const cartCount = document.querySelector('.cart-count');
                if (cartCount) {
                    let count = parseInt(cartCount.textContent);
                    if (isNaN(count) || count < 0) count = 0;
                    count = Math.max(0, count - 1);
                    cartCount.textContent = count;
                    localStorage.setItem('cartCount', count);
                }
                // Ensure header reflects true total from storage
                updateHeaderCartCount();
            }, 300);
        });
    });
    
    // Update item total
    function updateItemTotal(input) {
        const cartItem = input.closest('.cart-item');
        const priceElement = cartItem.querySelector('.item-price');
        const totalElement = cartItem.querySelector('.item-total');
        
        const price = parseFloat(priceElement.textContent.replace('KSh', '').trim());
        const quantity = parseInt(input.value);
        const total = price * quantity;
        
        totalElement.textContent = 'KSh ' + total.toFixed(2);
    }
    
    // Update cart summary
    function updateCartSummary() {
        const itemTotals = document.querySelectorAll('.item-total');
        let subtotal = 0;
        
        itemTotals.forEach(element => {
            subtotal += parseFloat(element.textContent.replace('KSh', '').trim());
        });
        
        const hasItems = itemTotals.length > 0;
        const shipping = hasItems ? 15.00 : 0.00;
        const discount = hasItems ? 50.00 : 0.00;
        const total = subtotal + shipping - discount;
        
        // Update summary
        const summaryRows = document.querySelectorAll('.summary-row');
        if (summaryRows.length >= 3) {
            // Subtotal
            summaryRows[0].querySelector('span:last-child').textContent = 'KSh ' + subtotal.toFixed(2);
            // Shipping (index 1)
            summaryRows[1].querySelector('span:last-child').textContent = hasItems ? ('KSh ' + shipping.toFixed(2)) : 'KSh 0.00';
            // Discount (index 2)
            summaryRows[2].querySelector('span:last-child').textContent = hasItems ? ('-KSh ' + discount.toFixed(2)) : 'KSh 0.00';
        }
        const totalRow = document.querySelector('.summary-row.total span:last-child');
        if (totalRow) {
            totalRow.textContent = 'KSh ' + total.toFixed(2);
        }

        // Toggle empty cart message if present
        const cartItemsContainer = document.querySelector('.cart-items');
        const emptyMsg = document.querySelector('.cart-empty');
        if (cartItemsContainer && emptyMsg) {
            if (hasItems) {
                emptyMsg.style.display = 'none';
            } else {
                emptyMsg.style.display = 'block';
                // Force header cart count to 0 when there are no items rendered
                const cartCount = document.querySelector('.cart-count');
                if (cartCount) {
                    cartCount.textContent = '0';
                }
                localStorage.setItem('cartCount', 0);
            }
        }
    }
    
    // Initialize cart
    updateCartSummary();
});