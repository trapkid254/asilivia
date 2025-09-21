document.addEventListener('DOMContentLoaded', function() {
    // Blog filters
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterBlogPosts);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', filterBlogPosts);
    }
    
    function filterBlogPosts() {
        const category = categoryFilter.value;
        const sortBy = sortFilter.value;
        
        // Simulate filtering
        alert(`Filtering by category: ${category}, sort by: ${sortBy}`);
        
        // In a real application, this would make an API call or filter existing posts
    }
    
    // Search form
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchInput = this.querySelector('input');
            const searchTerm = searchInput.value.trim();
            
            if (searchTerm) {
                alert(`Searching for: ${searchTerm}`);
                searchInput.value = '';
            }
        });
    }
    
    // Subscribe form
    const subscribeForm = document.querySelector('.subscribe-form');
    if (subscribeForm) {
        subscribeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const emailInput = this.querySelector('input');
            const email = emailInput.value.trim();
            
            if (email) {
                alert(`Thank you for subscribing with: ${email}`);
                emailInput.value = '';
            }
        });
    }
    
    // Read more links
    const readMoreLinks = document.querySelectorAll('.read-more');
    readMoreLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            // In a real application, this would navigate to the blog post page
            alert('Navigating to blog post details');
        });
    });
});