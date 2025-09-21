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
    
    initProductSlider();
    
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