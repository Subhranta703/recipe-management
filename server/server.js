const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// serve frontend
app.use(express.static("public"));

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
});


// Create a new user
app.post("/api/users", (req, res) => {
    const { name, email, dietary_preferences, allergies, skill_level, preferred_ingredients, avoided_ingredients } = req.body;

    const sql = `INSERT INTO users (name, email, dietary_preferences, allergies, skill_level, preferred_ingredients, avoided_ingredients)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [name, email, dietary_preferences, allergies, skill_level, preferred_ingredients, avoided_ingredients],
        (err, result) => {
            if (err) return res.json({ error: err });
            res.json({ message: "User created successfully", id: result.insertId });
        }
    );
});

// Fetch recipe suggestions from Spoonacular API
app.get("/api/recipes", async (req, res) => {
    const axios = require("axios");
    const query = req.query.q;

    const URL = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${process.env.API_KEY}&query=${query}&number=10`;

    try {
        const response = await axios.get(URL);
        res.json(response.data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));


app.post("/api/reviews", (req, res) => {
    const { user_id, recipe_id, rating, comment } = req.body;

    const sql = `INSERT INTO reviews (user_id, recipe_id, rating, comment) VALUES (?, ?, ?, ?)`;

    db.query(sql, [user_id, recipe_id, rating, comment], (err, result) => {
        if (err) return res.json({ error: err });
        res.json({ message: "Review added" });
    });
});

app.get("/api/reviews/:recipe_id", (req, res) => {
    const sql = `SELECT * FROM reviews WHERE recipe_id = ?`;
    db.query(sql, [req.params.recipe_id], (err, results) => {
        if (err) return res.json({ error: err });
        res.json(results);
    });
});
