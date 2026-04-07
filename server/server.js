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

// Simple placeholder token system (NOT secure, just for testing)
function createToken(username) {
    return Buffer.from(username).toString('base64');
}

function decodeToken(token) {
    try {
        return Buffer.from(token, 'base64').toString('utf8');
    } catch {
        return null;
    }
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
app.post('/add_task', (req, res) => {
    try {
        const { token, task, schedule } = req.body;

        if (!token || !task) {
            return res.status(400).json({ message: 'missing token or task' });
        }

        // Decode username from token
        const username = decodeToken(token);
        if (!username) {
            return res.status(401).json({ message: 'invalid token' });
        }

        // Load tasks.json
        const tasksFile = path.join(__dirname, 'data', 'tasks.json');
        let tasks = {};

        try {
            tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
        } catch {
            tasks = {};
        }

        // Ensure user has a task list
        if (!tasks[username]) {
            tasks[username] = [];
        }

        // Build new task object
        const newTask = {
            id: Date.now(),
            text: task
        };

        // Add schedule only if provided
        if (schedule) {
            newTask.schedule = schedule;
        }

        tasks[username].push(newTask);
        console.log("Writing to:", tasksFile);

        // Save file
        fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));

        return res.status(200).json({ message: 'task added', task: newTask });

    } catch (err) {
        console.error('Task add error:', err);
        return res.status(500).json({ message: 'unexpected error happened' });
    }
});
app.post('/get_all_tasks', (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'missing token' });
        }

        // Decode username from token
        const username = decodeToken(token);
        if (!username) {
            return res.status(401).json({ message: 'invalid token' });
        }

        // Load tasks.json
        const tasksFile = path.join(__dirname, 'data', 'tasks.json');
        let tasks = {};

        try {
            tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
        } catch {
            tasks = {};
        }

        // If user has no tasks, return empty array
        const userTasks = tasks[username] || [];

        return res.status(200).json({
            message: 'tasks fetched',
            tasks: userTasks
        });

    } catch (err) {
        console.error('Get tasks error:', err);
        return res.status(500).json({ message: 'unexpected error happened' });
    }
});
app.post('/get_task', (req, res) => {
    try {
        const { token, id } = req.body;

        if (!token || !id) {
            return res.status(400).json({ message: 'missing token or id' });
        }

        // Decode username from token
        const username = decodeToken(token);
        if (!username) {
            return res.status(401).json({ message: 'invalid token' });
        }

        // Load tasks.json
        const tasksFile = path.join(__dirname, 'data', 'tasks.json');
        let tasks = {};

        try {
            tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
        } catch {
            tasks = {};
        }

        // Get user's tasks (or empty array)
        const userTasks = tasks[username] || [];

        // Find the task with matching ID
        const task = userTasks.find(t => t.id === id);

        if (!task) {
            return res.status(404).json({ message: 'task not found' });
        }

        return res.status(200).json({
            message: 'task fetched',
            task: task
        });

    } catch (err) {
        console.error('Get task error:', err);
        return res.status(500).json({ message: 'unexpected error happened' });
    }
});
app.post('/delete_task', (req, res) => {
    try {
        const { token, id } = req.body;

        if (!token || !id) {
            return res.status(400).json({ message: 'missing token or id' });
        }

        // Decode username from token
        const username = decodeToken(token);
        if (!username) {
            return res.status(401).json({ message: 'invalid token' });
        }

        // Load tasks.json
        const tasksFile = path.join(__dirname, 'data', 'tasks.json');
        let tasks = {};

        try {
            tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
        } catch {
            tasks = {};
        }

        // User's tasks (or empty array)
        const userTasks = tasks[username] || [];

        // Convert id to number (your IDs are numeric timestamps)
        const taskId = Number(id);

        // Find index of the task
        const index = userTasks.findIndex(t => t.id === taskId);

        if (index === -1) {
            return res.status(404).json({ message: 'task not found' });
        }

        // Remove the task
        const removed = userTasks.splice(index, 1)[0];

        // Save updated tasks
        tasks[username] = userTasks;
        fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));

        return res.status(200).json({
            message: 'task deleted',
            deleted: removed
        });

    } catch (err) {
        console.error('Delete task error:', err);
        return res.status(500).json({ message: 'unexpected error happened' });
    }
});
app.post('/delete_all_tasks', (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'missing token' });
        }

        // Decode username from token
        const username = decodeToken(token);
        if (!username) {
            return res.status(401).json({ message: 'invalid token' });
        }

        // Load tasks.json
        const tasksFile = path.join(__dirname, 'data', 'tasks.json');
        let tasks = {};

        try {
            tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
        } catch {
            tasks = {};
        }

        // If user has no tasks, nothing to delete
        if (!tasks[username]) {
            tasks[username] = [];
        }

        // Clear all tasks
        const deletedTasks = tasks[username]; // keep a copy for response
        tasks[username] = [];

        // Save updated file
        fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));

        return res.status(200).json({
            message: 'all tasks deleted',
            deleted: deletedTasks
        });

    } catch (err) {
        console.error('Delete all tasks error:', err);
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
