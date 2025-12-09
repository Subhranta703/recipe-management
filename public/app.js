// State Management
const state = {
    view: 'home',
    recipes: [],
    currentRecipe: null,
    user: null,
    favorites: JSON.parse(localStorage.getItem('gourmet_favorites')) || [],
    filters: {
        cuisine: '',
        diet: '',
        type: '',
        maxReadyTime: ''
    }
};

// Toast Notification System
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'info') icon = 'info-circle';

    toast.innerHTML = `
        <i class="fas fa-${icon} toast-icon"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Favorites Logic
function toggleFavorite(e, recipe) {
    e.stopPropagation();
    const index = state.favorites.findIndex(f => f.id === recipe.id);
    const btn = e.currentTarget;

    if (index === -1) {
        state.favorites.push(recipe);
        btn.classList.add('active');
        showToast(`Saved "${recipe.title}" to favorites!`);
    } else {
        state.favorites.splice(index, 1);
        btn.classList.remove('active');
        showToast("Removed from favorites", 'info');
    }
    localStorage.setItem('gourmet_favorites', JSON.stringify(state.favorites));

    // If on favorites page, refresh
    if (state.view === 'favorites') renderFavorites();
}

// DOM Elements
const app = document.getElementById('app');

// Navigation
function navigateTo(view, params = null) {
    state.view = view;
    render();
    if (view === 'home') renderHome();
    if (view === 'search') renderSearch();
    if (view === 'favorites') renderFavorites();
    if (view === 'profile') renderProfile();
    if (view === 'login') renderLogin();
    if (view === 'register') renderRegister();
    if (view === 'details' && params) fetchAndRenderDetails(params);
}

// Render Logic
function render() {
    app.innerHTML = ''; // Clear current view
    // Fade in effect
    app.className = 'fade-in';
}

// ========== AUTHENTICATION VIEWS ==========

function renderLogin() {
    app.innerHTML = `
        <div class="fade-in" style="max-width:400px; margin:40px auto;">
            <h2 style="text-align:center; margin-bottom:30px;">Welcome Back</h2>
            <form class="profile-form" onsubmit="handleLogin(event)">
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="login-email" placeholder="you@example.com" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="login-password" placeholder="••••••••" required>
                </div>
                <button type="submit" class="btn-primary">Login</button>
                <p style="text-align:center; margin-top:20px; color:#888;">
                    Don't have an account? <a href="#" onclick="navigateTo('register'); return false;" style="color:var(--primary);">Register</a>
                </p>
            </form>
        </div>
    `;
}

function renderRegister() {
    app.innerHTML = `
        <div class="fade-in" style="max-width:500px; margin:40px auto;">
            <h2 style="text-align:center; margin-bottom:30px;">Create Your Account</h2>
            <form class="profile-form" onsubmit="handleRegister(event)">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="reg-name" placeholder="John Doe" required>
                </div>
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="reg-email" placeholder="you@example.com" required>
                </div>
                <div class="form-group">
                    <label>Password (min 6 characters)</label>
                    <input type="password" id="reg-password" placeholder="••••••••" minlength="6" required>
                </div>
                <div class="form-group">
                    <label>Cooking Skill Level</label>
                    <select id="reg-skill">
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                        <option>Master Chef</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Dietary Preferences</label>
                    <select id="reg-diet">
                        <option>None</option>
                        <option>Vegetarian</option>
                        <option>Vegan</option>
                        <option>Pescatarian</option>
                        <option>Gluten Free</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Allergies (comma-separated)</label>
                    <input type="text" id="reg-allergies" placeholder="e.g., peanuts, shellfish">
                </div>
                <button type="submit" class="btn-primary">Create Account</button>
                <p style="text-align:center; margin-top:20px; color:#888;">
                    Already have an account? <a href="#" onclick="navigateTo('login'); return false;" style="color:var(--primary);">Login</a>
                </p>
            </form>
        </div>
    `;
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || "Login failed.", "error");
            return;
        }

        // Save user to state and local storage
        state.user = data.user;
        localStorage.setItem('gourmet_user', JSON.stringify(data.user));
        updateNavForUser();
        showToast(`Welcome back, ${data.user.name}!`, "success");
        navigateTo('home');
    } catch (err) {
        showToast("Login failed. Server might be down.", "error");
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const userData = {
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        skill_level: document.getElementById('reg-skill').value,
        dietary_preferences: document.getElementById('reg-diet').value,
        allergies: document.getElementById('reg-allergies').value
    };

    try {
        const res = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || "Registration failed.", "error");
            return;
        }

        showToast("Account created! Please login.", "success");
        navigateTo('login');
    } catch (err) {
        showToast("Registration failed. Server might be down.", "error");
    }
}

function handleLogout() {
    state.user = null;
    localStorage.removeItem('gourmet_user');
    updateNavForUser();
    showToast("You have been logged out.", "info");
    navigateTo('home');
}

// Views
function renderHome() {
    const u = state.user;
    const greeting = u ? `Welcome back, ${u.name.split(' ')[0]}!` : 'Cook Like a Pro, Eat Like a King.';
    const subtext = u
        ? `Recipes tailored to your ${u.dietary_preferences || 'taste'} preferences.`
        : 'Discover personalized recipes tailored to your taste, dietary needs, and ingredients on hand.';

    app.innerHTML = `
        <section class="hero fade-in">
            <h1>${greeting}</h1>
            <p>${subtext}</p>
            <div class="search-container">
                <input type="text" id="hero-search" placeholder="What do you want to cook today?">
                <button onclick="handleHeroSearch()">Search</button>
            </div>
        </section>
        
        <div class="filters fade-in" style="animation-delay: 0.2s">
            <h2>${u ? 'Recommended For You' : 'Trending Recipes'}</h2>
        </div>
        <div id="results" class="fade-in" style="animation-delay: 0.4s">
            <div style="text-align:center; padding:40px; color:#888;">Loading recommendations...</div>
        </div>
    `;

    // Fetch personalized recipes
    fetchPersonalizedRecipes();
}

async function fetchPersonalizedRecipes() {
    const u = state.user;
    const params = new URLSearchParams({ number: 8 });

    // Use user preferences for personalization
    if (u) {
        if (u.dietary_preferences && u.dietary_preferences !== 'None') {
            params.set('diet', u.dietary_preferences.toLowerCase());
        }
        if (u.preferred_ingredients) {
            params.set('includeIngredients', u.preferred_ingredients);
        }
        if (u.avoided_ingredients) {
            params.set('excludeIngredients', u.avoided_ingredients);
        }
    }

    try {
        const res = await fetch(`http://localhost:3000/api/recipes?${params}`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            state.recipes = data.results;
            displayRecipes(data.results);
        } else {
            document.getElementById('results').innerHTML = '<div style="text-align:center; padding:40px; color:#888;">No recipes found. Try searching!</div>';
        }
    } catch (e) {
        document.getElementById('results').innerHTML = '<div style="text-align:center; padding:20px; color:red;">Could not load recommendations.</div>';
    }
}

function handleHeroSearch() {
    const query = document.getElementById('hero-search').value;
    navigateTo('search');
    // We need to wait for renderSearch to complete then trigger search
    setTimeout(() => {
        document.getElementById('search-input').value = query;
        searchRecipes(query);
    }, 100);
}

function renderSearch() {
    app.innerHTML = `
        <div class="fade-in">
            <div class="search-container">
                <input type="text" id="search-input" placeholder="Search for recipes (e.g. Pasta, Tacos)" oninput="debouncedSearch(this.value)">
                <button onclick="searchRecipes(document.getElementById('search-input').value)">Search</button>
            </div>
            
            <div class="filters">
                <select class="filter-select" id="cuisine" onchange="updateFilters()">
                    <option value="">All Cuisines</option>
                    <option value="italian">Italian</option>
                    <option value="mexican">Mexican</option>
                    <option value="asian">Asian</option>
                    <option value="indian">Indian</option>
                    <option value="american">American</option>
                </select>
                <select class="filter-select" id="diet" onchange="updateFilters()">
                    <option value="">No Diet Restrictions</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="gluten free">Gluten Free</option>
                    <option value="ketogenic">Keto</option>
                </select>
                 <select class="filter-select" id="type" onchange="updateFilters()">
                    <option value="">All Meal Types</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="main course">Main Course</option>
                    <option value="dessert">Dessert</option>
                    <option value="snack">Snack</option>
                </select>
            </div>

            <div id="results"></div>
        </div>
    `;

    // Restore previous results if any
    if (state.recipes.length > 0) {
        displayRecipes(state.recipes);
    }
}

// Utility: Debounce function
const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

const debouncedSearch = debounce((query) => searchRecipes(query), 600);

function updateFilters() {
    state.filters.cuisine = document.getElementById('cuisine').value;
    state.filters.diet = document.getElementById('diet').value;
    state.filters.type = document.getElementById('type').value;

    const query = document.getElementById('search-input').value;
    if (query) debouncedSearch(query);
}

async function searchRecipes(query) {
    if (!query) return;

    const resultsContainer = document.getElementById('results');
    // Skeleton Loading
    resultsContainer.innerHTML = Array(4).fill(0).map(() => `
        <div class="skeleton-card skeleton"></div>
    `).join('');

    const params = new URLSearchParams({
        q: query,
        ...state.filters
    });

    try {
        const res = await fetch(`http://localhost:3000/api/recipes?${params}`);
        const data = await res.json();
        state.recipes = data.results;
        displayRecipes(data.results);
    } catch (err) {
        console.error(err);
        showToast("Failed to fetch recipes. Backend might be down.", "error");
        resultsContainer.innerHTML = '<div style="text-align:center; width:100%; color:var(--accent);">Server Error. Please try again.</div>';
    }
}

function displayRecipes(recipes) {
    const container = document.getElementById('results');
    if (recipes.length === 0) {
        container.innerHTML = '<div style="text-align:center; width:100%; padding:40px; color:#888;"><i class="fas fa-cookie-bite" style="font-size:3rem; margin-bottom:20px; display:block;"></i>No recipes found. Try different keywords.</div>';
        return;
    }

    container.innerHTML = recipes.map(recipe => {
        const isFav = state.favorites.some(f => f.id === recipe.id);
        // Safely stringify recipe for onclick, escaping quotes
        const recipeString = JSON.stringify(recipe).replace(/'/g, "&#39;").replace(/"/g, "&quot;");

        return `
        <div class="recipe-card" onclick="navigateTo('details', ${recipe.id})">
            <button class="favorite-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(event, JSON.parse('${recipeString}'))">
                <i class="fas fa-heart"></i>
            </button>
            <img src="${recipe.image}" class="recipe-image" alt="${recipe.title}" loading="lazy">
            <div class="recipe-content">
                <h3 class="recipe-title">${recipe.title}</h3>
                <div style="margin-top:auto; padding-top:10px; border-top:1px solid #eee; display:flex; justify-content:space-between; color:#888; font-size:13px;">
                    <span><i class="fas fa-clock"></i> Quick</span>
                    <span><i class="fas fa-utensils"></i> Recipe</span>
                </div>
            </div>
        </div>
    `}).join('');
}

function renderFavorites() {
    app.innerHTML = `
        <div class="fade-in">
            <h2 style="margin-bottom:20px;">Your Saved Recipes <span style="font-size:1rem; color:#888;">(${state.favorites.length})</span></h2>
            <div id="results"></div>
        </div>
    `;
    displayRecipes(state.favorites);
}

// Details View
async function fetchAndRenderDetails(id) {
    app.innerHTML = '<div style="text-align:center; padding:50px;">Loading recipe details...</div>';

    try {
        const res = await fetch(`http://localhost:3000/api/recipes/${id}`);
        const recipe = await res.json();
        state.currentRecipe = recipe;

        app.innerHTML = `
            <div class="fade-in">
                <button class="back-btn" onclick="navigateTo('search')">
                    <i class="fas fa-arrow-left"></i> &nbsp; Back to Search
                </button>
                
                <div class="split-view">
                    <div>
                        <img src="${recipe.image}" class="recipe-detail-img">
                        <div style="margin-top:20px; display:flex; gap:15px; flex-wrap:wrap;">
                            ${recipe.vegetarian ? '<span class="filter-select" style="background:#e8f5e9; color:#2e7d32">Vegetarian</span>' : ''}
                            ${recipe.vegan ? '<span class="filter-select" style="background:#f1f8e9; color:#558b2f">Vegan</span>' : ''}
                            ${recipe.glutenFree ? '<span class="filter-select" style="background:#fff3e0; color:#ef6c00">Gluten Free</span>' : ''}
                        </div>
                    </div>
                    
                    <div>
                        <h2>${recipe.title}</h2>
                        <div class="recipe-meta">
                            <span><i class="fas fa-clock"></i> ${recipe.readyInMinutes} mins</span>
                            <span><i class="fas fa-user-friends"></i> ${recipe.servings} servings</span>
                            <span><i class="fas fa-star"></i> ${Math.round(recipe.healthScore / 10)} / 10 Health</span>
                        </div>
                        
                        <div dangerouslySetInnerHTML="this.innerHTML='${recipe.summary}'" style="color:#666; margin-bottom:20px; font-size:15px;">
                            ${recipe.summary ? recipe.summary.slice(0, 300) + '...' : ''}
                        </div>

                        <h3>Ingredients</h3>
                        <div class="ingredients-list">
                            ${recipe.extendedIngredients.map(ing => `
                                <div class="ingredient-item" title="${ing.meta}">
                                    • ${ing.original}
                                </div>
                            `).join('')}
                        </div>
                        
                        <div style="background:#f0f8ff; padding:15px; border-radius:8px; margin-top:20px;">
                            <h4 style="margin-bottom:10px; color:var(--dark);">Nutrition (per serving)</h4>
                            <div style="display:flex; gap:15px; flex-wrap:wrap; font-size:14px; font-weight:600; color:var(--text-light);">
                                ${recipe.nutrition?.nutrients ? recipe.nutrition.nutrients.filter(
            n => ['Calories', 'Protein', 'Carbohydrates', 'Fat'].includes(n.name)
        ).map(n => `
                                    <span style="background:white; padding:5px 10px; border-radius:15px; border:1px solid #ddd;">
                                        ${n.name}: ${n.amount}${n.unit}
                                    </span>
                                `).join('') : '<span>Nutrition info unavailable</span>'}
                            </div>
                        </div>
                        
                        <h3 style="margin-top:20px">Instructions</h3>
                        <div style="color:#444; line-height:1.8; font-size:15px;">
                            ${recipe.instructions || 'No instructions provided.'}
                        </div>
                        
                        <div style="margin-top:40px; padding-top:20px; border-top:1px solid #eee;">
                            <h3>Reviews</h3>
                            <div id="reviews-container">
                                <p style="color:#999; font-style:italic;">Loading reviews...</p>
                            </div>
                            
                            <form style="margin-top:20px; background:#f9f9f9; padding:20px; border-radius:12px;" onsubmit="handleReviewSubmit(event, ${recipe.id})">
                                <h4>Write a Review</h4>
                                <div class="form-group">
                                    <label>Rating</label>
                                    <select id="review-rating">
                                        <option value="5">5 - Excellent</option>
                                        <option value="4">4 - Very Good</option>
                                        <option value="3">3 - Average</option>
                                        <option value="2">2 - Poor</option>
                                        <option value="1">1 - Terrible</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Comment</label>
                                    <textarea id="review-comment" rows="3" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;" placeholder="Share your experience..."></textarea>
                                </div>
                                <button type="submit" class="btn-primary" style="width:auto;">Post Review</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
                </div>
            </div>
        `;
        // Load reviews after render
        fetchReviews(id);
    } catch (e) {
        app.innerHTML = `<p class="error">Error loading specific recipe: ${e.message}</p>`;
    }
}

// Profile View
function renderProfile() {
    // Require login
    if (!state.user) {
        showToast("Please login to view your profile.", "info");
        navigateTo('login');
        return;
    }

    const u = state.user;

    app.innerHTML = `
        <div class="fade-in" style="max-width:600px; margin:40px auto;">
            <h2 style="text-align:center; margin-bottom:10px;">Your Culinary Profile</h2>
            <p style="text-align:center; color:#888; margin-bottom:30px;">Hello, ${u.name || 'Chef'}! Manage your preferences below.</p>
            
            <form class="profile-form" onsubmit="handleProfileUpdate(event)">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="profile-name" value="${u.name || ''}" placeholder="John Doe">
                </div>
                <div class="form-group">
                    <label>Email Address (cannot change)</label>
                    <input type="email" value="${u.email || ''}" disabled style="background:#eee; cursor:not-allowed;">
                </div>
                <div class="form-group">
                    <label>Cooking Skill Level</label>
                    <select id="profile-skill">
                        <option ${u.skill_level === 'Beginner' ? 'selected' : ''}>Beginner</option>
                        <option ${u.skill_level === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                        <option ${u.skill_level === 'Advanced' ? 'selected' : ''}>Advanced</option>
                        <option ${u.skill_level === 'Master Chef' ? 'selected' : ''}>Master Chef</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Dietary Preferences</label>
                    <select id="profile-diet">
                        <option ${u.dietary_preferences === 'None' ? 'selected' : ''}>None</option>
                        <option ${u.dietary_preferences === 'Vegetarian' ? 'selected' : ''}>Vegetarian</option>
                        <option ${u.dietary_preferences === 'Vegan' ? 'selected' : ''}>Vegan</option>
                        <option ${u.dietary_preferences === 'Pescatarian' ? 'selected' : ''}>Pescatarian</option>
                        <option ${u.dietary_preferences === 'Gluten Free' ? 'selected' : ''}>Gluten Free</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Allergies (comma-separated)</label>
                    <input type="text" id="profile-allergies" value="${u.allergies || ''}" placeholder="e.g., peanuts, shellfish">
                </div>
                <div class="form-group">
                    <label>Preferred Ingredients (comma-separated)</label>
                    <input type="text" id="profile-preferred" value="${u.preferred_ingredients || ''}" placeholder="e.g., chicken, garlic, tomatoes">
                </div>
                <div class="form-group">
                    <label>Ingredients to Avoid (comma-separated)</label>
                    <input type="text" id="profile-avoided" value="${u.avoided_ingredients || ''}" placeholder="e.g., mushrooms, olives">
                </div>
                <button type="submit" class="btn-primary">Update Profile</button>
            </form>
        </div>
    `;
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    const updatedData = {
        name: document.getElementById('profile-name').value,
        skill_level: document.getElementById('profile-skill').value,
        dietary_preferences: document.getElementById('profile-diet').value,
        allergies: document.getElementById('profile-allergies').value,
        preferred_ingredients: document.getElementById('profile-preferred').value,
        avoided_ingredients: document.getElementById('profile-avoided').value
    };

    try {
        const res = await fetch(`http://localhost:3000/api/auth/user/${state.user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        const data = await res.json();

        if (!res.ok || data.error) {
            showToast(data.error || "Failed to update profile.", "error");
            return;
        }

        // Update local state
        state.user = { ...state.user, ...updatedData };
        localStorage.setItem('gourmet_user', JSON.stringify(state.user));
        showToast("Profile updated successfully!", "success");
    } catch (err) {
        console.log("Fallback: Saving locally");
        state.user = { ...state.user, ...updatedData };
        localStorage.setItem('gourmet_user', JSON.stringify(state.user));
        showToast("✨ Profile saved locally.", "info");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// Reviews Logic
async function handleReviewSubmit(e, recipeId) {
    e.preventDefault();

    // Require login
    if (!state.user || !state.user.id) {
        showToast("Please login to post a review.", "error");
        navigateTo('login');
        return;
    }

    const rating = document.getElementById('review-rating').value;
    const comment = document.getElementById('review-comment').value;
    const userId = state.user.id;

    try {
        const res = await fetch('http://localhost:3000/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, recipe_id: recipeId, rating: parseInt(rating), comment })
        });

        let data;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await res.json();
        } else {
            throw new Error("Non-JSON response");
        }

        if (!res.ok || data.error) throw new Error(data.error || "Trigger Demo Mode");

        showToast("Review posted successfully!", "success");
        document.getElementById('review-comment').value = '';
        fetchReviews(recipeId);
    } catch (err) {
        // Demo Mode Simulation
        console.log("Entering Demo/Fallback Mode for Review:", err.message);
        showToast("✨ DEMO: Review posted!", "info");

        const container = document.getElementById('reviews-container');
        if (container.innerText.includes('Loading') || container.innerText.includes('No reviews')) container.innerHTML = '';

        // Prepend new review
        const newReviewHTML = `
            <div style="background:white; padding:15px; border-radius:8px; border:1px solid #eee; margin-bottom:10px; border-left: 4px solid #4ECDC4; animation: fadeIn 0.5s;">
                <div style="font-size:12px; color:#999; margin-bottom:5px;">${state.user?.name || 'You'} (Demo)</div>
                <div style="color:#f1c40f; margin-bottom:5px;">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
                <div style="font-size:14px;">${comment}</div>
            </div>
        `;
        container.innerHTML = newReviewHTML + container.innerHTML;
        document.getElementById('review-comment').value = '';
    }
}

async function fetchReviews(recipeId) {
    const container = document.getElementById('reviews-container');
    try {
        const res = await fetch(`http://localhost:3000/api/reviews/${recipeId}`);
        const reviews = await res.json();

        if (reviews.length === 0) {
            container.innerHTML = '<p style="color:#999; font-style:italic;">No reviews yet. Be the first to cook this!</p>';
            return;
        }

        // Calculate Average
        const avg = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length;

        container.innerHTML = `
            <div style="margin-bottom:15px; font-weight:bold; color:#FF6B6B;">
                Average Rating: ${avg.toFixed(1)} / 5 (${reviews.length} reviews)
            </div>
            ${reviews.map(r => `
                <div style="background:white; padding:15px; border-radius:8px; border:1px solid #eee; margin-bottom:10px;">
                    <div style="font-size:12px; color:#999; margin-bottom:5px;">${r.user_name || 'Anonymous'}</div>
                    <div style="color:#f1c40f; margin-bottom:5px;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                    <div style="font-size:14px;">${r.comment}</div>
                </div>
            `).join('')}
        `;
    } catch (e) {
        container.innerHTML = '<p style="color:red; font-size:12px;">Failed to load reviews (DB offline).</p>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check for existing user session
    const savedUser = localStorage.getItem('gourmet_user');
    if (savedUser) {
        try {
            state.user = JSON.parse(savedUser);
            updateNavForUser();
        } catch (e) {
            localStorage.removeItem('gourmet_user');
        }
    }
    navigateTo('home');
});

// Update navbar based on login state
function updateNavForUser() {
    const loginBtn = document.getElementById('nav-login-btn');
    const logoutBtn = document.getElementById('nav-logout-btn');
    const profileBtn = document.getElementById('nav-profile-btn');

    if (state.user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (profileBtn) profileBtn.style.display = 'inline-block';
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (profileBtn) profileBtn.style.display = 'none';
    }
}