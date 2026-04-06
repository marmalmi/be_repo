require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const argon2 = require('argon2');

const app = express();
app.use(express.json());

// Correct path for your structure
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Load users from JSON
function loadUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

// Save users to JSON
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ----------------------
//   REGISTER ROUTE
// ----------------------
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Basic validation
        if (!username || !password) {
            return res.status(400).json({ message: 'missing username or password' });
        }

        const users = loadUsers();

        // Check if username exists
        const exists = users.find(u => u.username === username);
        if (exists) {
            return res.status(409).json({ message: 'username exists' });
        }

        // Hash password with Argon2
        const passwordHash = await argon2.hash(password);

        // Save new user
        users.push({ username, passwordHash });
        saveUsers(users);

        return res.status(201).json({ message: 'registered successfully' });

    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ message: 'unexpected error happened' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Basic validation
        if (!username || !password) {
            return res.status(400).json({ message: 'missing username or password' });
        }

        const users = loadUsers();

        // Find user
        const user = users.find(u => u.username === username);
        if (!user) {
            // Standard practice: 404 for unknown username
            return res.status(404).json({ message: 'username not found' });
        }

        // Verify password using Argon2
        const isValid = await argon2.verify(user.passwordHash, password);

        if (!isValid) {
            // Username exists but password is wrong
            return res.status(401).json({ message: false });
        }

        // Login successful
        return res.status(200).json({ message: true });

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'unexpected error happened' });
    }
});

// ----------------------
//   SERVER START
// ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
