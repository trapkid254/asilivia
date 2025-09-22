// Centralized Data Management System
// This script handles all data operations between admin and customer pages

class DataManager {
    constructor() {
        this.initializeData();
    }

    // Initialize default data structure
    initializeData() {
        // Initialize products if not exists
        if (!localStorage.getItem('products')) {
            const defaultProducts = [
                {
                    id: 'prod_1',
                    name: "Premium Smartphone XYZ",
                    price: 89999,
                    category: "mobiles",
                    brand: "apple",
                    image: "../assets/images/placeholder-smartphone.jpg",
                    description: "Latest smartphone with advanced features",
                    stock: 25,
                    status: "active",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'prod_2',
                    name: "Ultrabook Pro 2023",
                    price: 129999,
                    category: "laptops",
                    brand: "dell",
                    image: "../assets/images/placeholder-laptop.jpg",
                    description: "High-performance laptop for professionals",
                    stock: 15,
                    status: "active",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'prod_3',
                    name: "Wireless Noise-Cancelling Headphones",
                    price: 24999,
                    category: "accessories",
                    brand: "sony",
                    image: "../assets/images/placeholder-headphones.jpg",
                    description: "Premium wireless headphones with noise cancellation",
                    stock: 40,
                    status: "active",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'prod_4',
                    name: "Smart Fitness Tracker",
                    price: 19999,
                    category: "accessories",
                    brand: "samsung",
                    image: "../assets/images/placeholder-smartwatch.jpg",
                    description: "Advanced fitness tracking with health monitoring",
                    stock: 30,
                    status: "active",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'prod_5',
                    name: "Gaming Laptop Extreme",
                    price: 189999,
                    category: "laptops",
                    brand: "hp",
                    image: "../assets/images/placeholder-laptop.jpg",
                    description: "High-end gaming laptop with RTX graphics",
                    stock: 8,
                    status: "active",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'prod_6',
                    name: "Flagship Smartphone Pro",
                    price: 109999,
                    category: "mobiles",
                    brand: "samsung",
                    image: "../assets/images/placeholder-smartphone.jpg",
                    description: "Professional smartphone with advanced camera",
                    stock: 20,
                    status: "active",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];
            this.setProducts(defaultProducts);
        }

        // Initialize orders if not exists
        if (!localStorage.getItem('orders')) {
            this.setOrders([]);
        }

        // Initialize bookings if not exists
        if (!localStorage.getItem('bookings')) {
            this.setBookings([]);
        }

        // Initialize customers if not exists
        if (!localStorage.getItem('customers')) {
            this.setCustomers([]);
        }
    }

    // Product Management
    getProducts() {
        try {
            const products = localStorage.getItem('products');
            return products ? JSON.parse(products) : [];
        } catch (e) {
            console.error('Error getting products:', e);
            return [];
        }
    }

    setProducts(products) {
        try {
            localStorage.setItem('products', JSON.stringify(products));
            this.notifyDataChange('products', products);
        } catch (e) {
            console.error('Error setting products:', e);
        }
    }

    addProduct(product) {
        const products = this.getProducts();
        const newProduct = {
            ...product,
            id: 'prod_' + Date.now(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: product.status || 'active'
        };
        products.push(newProduct);
        this.setProducts(products);
        return newProduct;
    }

    updateProduct(productId, updates) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id === productId);
        if (index !== -1) {
            products[index] = {
                ...products[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.setProducts(products);
            return products[index];
        }
        return null;
    }

    deleteProduct(productId) {
        const products = this.getProducts();
        const filteredProducts = products.filter(p => p.id !== productId);
        this.setProducts(filteredProducts);
        return true;
    }

    getActiveProducts() {
        return this.getProducts().filter(p => p.status === 'active');
    }

    // Order Management
    getOrders() {
        try {
            const orders = localStorage.getItem('orders');
            return orders ? JSON.parse(orders) : [];
        } catch (e) {
            console.error('Error getting orders:', e);
            return [];
        }
    }

    setOrders(orders) {
        try {
            localStorage.setItem('orders', JSON.stringify(orders));
            this.notifyDataChange('orders', orders);
        } catch (e) {
            console.error('Error setting orders:', e);
        }
    }

    addOrder(order) {
        const orders = this.getOrders();
        const newOrder = {
            ...order,
            id: 'ORD-' + Date.now(),
            date: new Date().toISOString(),
            status: order.status || 'pending'
        };
        orders.push(newOrder);
        this.setOrders(orders);
        
        // Update customer data
        this.updateCustomerData(order.customer);
        
        return newOrder;
    }

    updateOrderStatus(orderId, status) {
        const orders = this.getOrders();
        const index = orders.findIndex(o => o.id === orderId);
        if (index !== -1) {
            orders[index].status = status;
            orders[index].updatedAt = new Date().toISOString();
            this.setOrders(orders);
            return orders[index];
        }
        return null;
    }

    // Booking Management
    getBookings() {
        try {
            const bookings = localStorage.getItem('bookings');
            return bookings ? JSON.parse(bookings) : [];
        } catch (e) {
            console.error('Error getting bookings:', e);
            return [];
        }
    }

    setBookings(bookings) {
        try {
            localStorage.setItem('bookings', JSON.stringify(bookings));
            this.notifyDataChange('bookings', bookings);
        } catch (e) {
            console.error('Error setting bookings:', e);
        }
    }

    addBooking(booking) {
        const bookings = this.getBookings();
        const newBooking = {
            ...booking,
            id: 'BOOK-' + Date.now(),
            createdAt: new Date().toISOString(),
            status: booking.status || 'pending'
        };
        bookings.push(newBooking);
        this.setBookings(bookings);
        
        // Update customer data
        this.updateCustomerData(booking.customer);
        
        return newBooking;
    }

    updateBookingStatus(bookingId, status) {
        const bookings = this.getBookings();
        const index = bookings.findIndex(b => b.id === bookingId);
        if (index !== -1) {
            bookings[index].status = status;
            bookings[index].updatedAt = new Date().toISOString();
            this.setBookings(bookings);
            return bookings[index];
        }
        return null;
    }

    // Customer Management
    getCustomers() {
        try {
            const customers = localStorage.getItem('customers');
            return customers ? JSON.parse(customers) : [];
        } catch (e) {
            console.error('Error getting customers:', e);
            return [];
        }
    }

    setCustomers(customers) {
        try {
            localStorage.setItem('customers', JSON.stringify(customers));
            this.notifyDataChange('customers', customers);
        } catch (e) {
            console.error('Error setting customers:', e);
        }
    }

    updateCustomerData(customerInfo) {
        if (!customerInfo || (!customerInfo.email && !customerInfo.phone)) return;
        
        const customers = this.getCustomers();
        const identifier = customerInfo.email || customerInfo.phone;
        const existingIndex = customers.findIndex(c => 
            c.email === identifier || c.phone === identifier
        );

        if (existingIndex !== -1) {
            // Update existing customer
            customers[existingIndex] = {
                ...customers[existingIndex],
                ...customerInfo,
                updatedAt: new Date().toISOString()
            };
        } else {
            // Add new customer
            const newCustomer = {
                ...customerInfo,
                id: 'CUST-' + Date.now(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            customers.push(newCustomer);
        }
        
        this.setCustomers(customers);
    }

    // Statistics and Analytics
    getStatistics() {
        const orders = this.getOrders();
        const bookings = this.getBookings();
        const customers = this.getCustomers();
        const products = this.getProducts();

        const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
        const totalOrders = orders.length;
        const totalBookings = bookings.length;
        const totalCustomers = customers.length;
        const activeProducts = products.filter(p => p.status === 'active').length;

        return {
            totalRevenue,
            totalOrders,
            totalBookings,
            totalCustomers,
            activeProducts,
            recentOrders: orders.slice(-5).reverse(),
            recentBookings: bookings.slice(-5).reverse()
        };
    }

    // Data change notification system
    notifyDataChange(dataType, data) {
        // Dispatch custom event for real-time updates
        const event = new CustomEvent('dataChanged', {
            detail: { type: dataType, data: data }
        });
        window.dispatchEvent(event);
    }

    // Search functionality
    searchProducts(query) {
        const products = this.getActiveProducts();
        const lowercaseQuery = query.toLowerCase();
        
        return products.filter(product => 
            product.name.toLowerCase().includes(lowercaseQuery) ||
            product.category.toLowerCase().includes(lowercaseQuery) ||
            product.brand.toLowerCase().includes(lowercaseQuery) ||
            (product.description && product.description.toLowerCase().includes(lowercaseQuery))
        );
    }

    // Filter products
    filterProducts(filters) {
        let products = this.getActiveProducts();
        
        if (filters.category && filters.category.length > 0) {
            products = products.filter(p => filters.category.includes(p.category));
        }
        
        if (filters.brand && filters.brand.length > 0) {
            products = products.filter(p => filters.brand.includes(p.brand));
        }
        
        if (filters.minPrice !== undefined) {
            products = products.filter(p => p.price >= filters.minPrice);
        }
        
        if (filters.maxPrice !== undefined) {
            products = products.filter(p => p.price <= filters.maxPrice);
        }
        
        return products;
    }

    // Sort products
    sortProducts(products, sortBy) {
        const sortedProducts = [...products];
        
        switch (sortBy) {
            case 'price-low':
                return sortedProducts.sort((a, b) => a.price - b.price);
            case 'price-high':
                return sortedProducts.sort((a, b) => b.price - a.price);
            case 'name':
                return sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
            case 'newest':
                return sortedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            default:
                return sortedProducts;
        }
    }
}

// Create global instance
window.dataManager = new DataManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}
