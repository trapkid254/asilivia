document.addEventListener('DOMContentLoaded', function() {
    // Auth tabs
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    
    authTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all tabs
            authTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all forms
            authForms.forEach(form => form.classList.remove('active'));
            // Show the target form
            document.getElementById(targetTab + 'Form').classList.add('active');
        });
    });
    
    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            // Simple validation
            if (!email || !password) {
                alert('Please fill in all fields');
                return;
            }
            // Verify customer exists in database before proceeding
            try {
                if (window.api && typeof window.api.getJSON === 'function') {
                    const params = new URLSearchParams();
                    params.set('email', String(email).trim());
                    await window.api.getJSON('/api/customers/find?' + params.toString());
                } else {
                    const resp = await fetch('/api/customers/find?email=' + encodeURIComponent(String(email).trim()));
                    if (!resp.ok) throw new Error('HTTP '+resp.status);
                }
            } catch (err) {
                alert('Account not found. Please register first.');
                return;
            }
            // Persist and redirect on success
            try { localStorage.setItem('currentCustomer', JSON.stringify({ email: email.trim() })); } catch(_) {}
            window.location.href = 'dashboard.html#orders';
        });
    }
    
    // Register form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const firstName = document.getElementById('registerFirstName').value;
            const lastName = document.getElementById('registerLastName').value;
            const email = document.getElementById('registerEmail').value;
            const phone = document.getElementById('registerPhone').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            const termsAgree = document.getElementById('termsAgree').checked;
            
            // Simple validation
            if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
                alert('Please fill in all fields');
                return;
            }
            
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            
            if (!termsAgree) {
                alert('Please agree to the terms and conditions');
                return;
            }
            
            // Simulate registration process
            alert('Registration successful! You can now login.');
            
            // Switch to login tab
            authTabs[0].click();
        });
    }
    
    // Social login buttons
    const socialButtons = document.querySelectorAll('.btn-social');
    socialButtons.forEach(button => {
        button.addEventListener('click', function() {
            const platform = this.classList.contains('google') ? 'Google' : 'Facebook';
            alert(`${platform} login would be implemented here`);
        });
    });
});