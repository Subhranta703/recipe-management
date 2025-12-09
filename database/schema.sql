-- Database Schema for Recipe Management System

CREATE DATABASE IF NOT EXISTS recipe_db;
USE recipe_db;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    dietary_preferences VARCHAR(255),
    allergies VARCHAR(255),
    skill_level VARCHAR(50),
    preferred_ingredients TEXT,
    avoided_ingredients TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Recipes Table
CREATE TABLE IF NOT EXISTS recipes (
    id INT PRIMARY KEY, 
    title VARCHAR(255),
    image VARCHAR(512),
    data JSON 
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    recipe_id INT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);


