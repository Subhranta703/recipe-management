 -- SQL initialization file
CREATE DATABASE recipe_management;

USE recipe_management;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(120) UNIQUE,
    dietary_preferences TEXT,
    allergies TEXT,
    skill_level VARCHAR(50),
    preferred_ingredients TEXT,
    avoided_ingredients TEXT
);

CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    recipe_id VARCHAR(100),
    rating INT,
    comment TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
