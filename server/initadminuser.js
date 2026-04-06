require('dotenv').config();
const fs = require('fs');
const path = require('path');
const argon2 = require('argon2');

const USERS_FILE = path.join(__dirname, 'data', 'users.json');

function loadUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

async function initAdmin() {
    try {
        const username = process.env.ADMIN_USERNAME;
        const password = process.env.ADMIN_PASSWORD;

        if (!username || !password) {
            console.error('Missing ADMIN_USERNAME or ADMIN_PASSWORD in .env');
            process.exit(1);
        }

        const users = loadUsers();

        // Check if admin already exists
        const exists = users.find(u => u.username === username);
        if (exists) {
            console.log('Admin user already exists. Nothing to do.');
            process.exit(0);
        }

        // Hash password
        const passwordHash = await argon2.hash(password);

        // Add admin user
        users.push({ username, passwordHash });
        saveUsers(users);

        console.log('Admin user created successfully.');
        process.exit(0);

    } catch (err) {
        console.error('Unexpected error:', err);
        process.exit(1);
    }
}

initAdmin();
