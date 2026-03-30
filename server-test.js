const express = require("express");
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.json());

// Example database connection (replace with your credentials)
const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "your_password",
    database: "users_db"
});

// LOGIN endpoint
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
    if (rows.length === 0) {
        return res.json({ message: "User not found!" });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (match) {
        return res.json({ message: "Login successful" });
    } else {
        return res.json({ message: "Incorrect password" });
    }
});

// REGISTER endpoint
app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        [username, hashedPassword]
    );

    res.json({ message: "User registered successfully" });
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});