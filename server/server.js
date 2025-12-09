const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());


const path = require('path');
app.use(express.static(path.join(__dirname, "../public")));


let db;
try {
    db = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    db.connect(err => {
        if (err) {
            console.error("Database connection failed:", err.message);
            console.log("Running in NO-DB mode. User/Review features will be disabled.");
            db = null;
        } else {
            console.log("Connected to MySQL database.");
        }
    });

} catch (e) {
    console.error("Database init error:", e.message);
    db = null;
}



// Register a new user
app.post("/api/auth/register", async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database not available" });

    const { name, email, password, dietary_preferences, allergies, skill_level, preferred_ingredients, avoided_ingredients } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: "Name, email and password are required." });
    }

    try {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const sql = `INSERT INTO users (name, email, password_hash, dietary_preferences, allergies, skill_level, preferred_ingredients, avoided_ingredients)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        db.query(sql, [name, email, password_hash, dietary_preferences || '', allergies || '', skill_level || 'Beginner', preferred_ingredients || '', avoided_ingredients || ''],
            (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({ error: "Email already registered." });
                    }
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: "Registration successful!", id: result.insertId, name, email });
            }
        );
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Login
app.post("/api/auth/login", (req, res) => {
    if (!db) return res.status(503).json({ error: "Database not available" });

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    const sql = `SELECT * FROM users WHERE email = ?`;

    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length === 0) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const user = results[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        // Return user data (without password)
        res.json({
            message: "Login successful!",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                skill_level: user.skill_level,
                dietary_preferences: user.dietary_preferences,
                allergies: user.allergies,
                preferred_ingredients: user.preferred_ingredients,
                avoided_ingredients: user.avoided_ingredients
            }
        });
    });
});

// Get current user (by ID)
app.get("/api/auth/user/:id", (req, res) => {
    if (!db) return res.status(503).json({ error: "Database not available" });

    const sql = `SELECT id, name, email, skill_level, dietary_preferences, allergies, preferred_ingredients, avoided_ingredients FROM users WHERE id = ?`;

    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: "User not found" });
        res.json(results[0]);
    });
});

// Update user profile
app.put("/api/auth/user/:id", (req, res) => {
    if (!db) return res.status(503).json({ error: "Database not available" });

    const { name, skill_level, dietary_preferences, allergies, preferred_ingredients, avoided_ingredients } = req.body;
    const sql = `UPDATE users SET name = ?, skill_level = ?, dietary_preferences = ?, allergies = ?, preferred_ingredients = ?, avoided_ingredients = ? WHERE id = ?`;

    db.query(sql, [name, skill_level, dietary_preferences, allergies, preferred_ingredients, avoided_ingredients, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });
        res.json({ message: "Profile updated successfully" });
    });
});

//  LEGACY: Create a new user (kept for backwards compat)
app.post("/api/users", (req, res) => {
    if (!db) return res.status(503).json({ error: "Database not available" });
    const { name, email, dietary_preferences, allergies, skill_level, preferred_ingredients, avoided_ingredients } = req.body;

    const sql = `INSERT INTO users (name, email, password_hash, dietary_preferences, allergies, skill_level, preferred_ingredients, avoided_ingredients)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [name, email, '', dietary_preferences, allergies, skill_level, preferred_ingredients, avoided_ingredients],
        (err, result) => {
            if (err) return res.json({ error: err });
            res.json({ message: "User created successfully", id: result.insertId });
        }
    );
});

// Fetch recipe suggestions from Spoonacular API
// Fetch recipe suggestions from Spoonacular API with filters
const apiCache = new Map();
const CACHE_TTL = 3600000; // 1 hour

app.get("/api/recipes", async (req, res) => {
    const axios = require("axios");
    const { q, cuisine, diet, type, maxReadyTime, includeIngredients, excludeIngredients, number } = req.query;

    let URL = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${process.env.API_KEY}&query=${q || ''}&number=${number || 12}`;

    if (cuisine) URL += `&cuisine=${cuisine}`;
    if (diet) URL += `&diet=${diet}`;
    if (type) URL += `&type=${type}`;
    if (maxReadyTime) URL += `&maxReadyTime=${maxReadyTime}`;
    if (includeIngredients) URL += `&includeIngredients=${encodeURIComponent(includeIngredients)}`;
    if (excludeIngredients) URL += `&excludeIngredients=${encodeURIComponent(excludeIngredients)}`;

    // Check cache
    const cacheKey = URL;
    if (apiCache.has(cacheKey)) {
        const { timestamp, data } = apiCache.get(cacheKey);
        if (Date.now() - timestamp < CACHE_TTL) {
            console.log("Serving from cache:", cacheKey);
            return res.json(data);
        }
    }

    try {
        const response = await axios.get(URL);
        // Set cache
        apiCache.set(cacheKey, { timestamp: Date.now(), data: response.data });
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Fetch specific recipe details
app.get("/api/recipes/:id", async (req, res) => {
    const axios = require("axios");
    const { id } = req.params;
    const URL = `https://api.spoonacular.com/recipes/${id}/information?apiKey=${process.env.API_KEY}`;

    const cacheKey = `details_${id}`;
    if (apiCache.has(cacheKey)) {
        const { timestamp, data } = apiCache.get(cacheKey);
        if (Date.now() - timestamp < CACHE_TTL) {
            console.log("Serving details from cache:", id);
            return res.json(data);
        }
    }

    try {
        const response = await axios.get(URL);
        apiCache.set(cacheKey, { timestamp: Date.now(), data: response.data });
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));


app.post("/api/reviews", (req, res) => {
    if (!db) return res.status(503).json({ error: "Database not available" });
    const { user_id, recipe_id, rating, comment } = req.body;

    const sql = `INSERT INTO reviews (user_id, recipe_id, rating, comment) VALUES (?, ?, ?, ?)`;

    db.query(sql, [user_id, recipe_id, rating, comment], (err, result) => {
        if (err) return res.json({ error: err });
        res.json({ message: "Review added" });
    });
});

app.get("/api/reviews/:recipe_id", (req, res) => {
    if (!db) return res.json([]); // Return empty reviews if DB is down
    const sql = `SELECT r.*, u.name as user_name FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.recipe_id = ? ORDER BY r.created_at DESC`;
    db.query(sql, [req.params.recipe_id], (err, results) => {
        if (err) return res.json({ error: err });
        res.json(results);
    });
});