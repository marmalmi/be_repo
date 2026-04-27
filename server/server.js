require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const argon2 = require('argon2');
const cors = require('cors');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const ENC_PREFIX = 'enc:v1';

const TASK_ENCRYPTION_KEY = crypto.createHash('sha256')
    .update(process.env.TASK_ENCRYPTION_KEY || 'default-insecure-key')
    .digest();

// In-memory session store: token → username
// Sessions are lost on server restart (acceptable for this project scope)
const sessions = new Map();

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Ensure data directory and files exist on startup
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, '{}');

// --- Validation ---

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/;

function validateUsername(u) {
    return typeof u === 'string' && USERNAME_RE.test(u);
}

function validatePassword(p) {
    return typeof p === 'string' && p.length >= 8 && p.length <= 128;
}

function validateTaskText(t) {
    return typeof t === 'string' && t.length >= 1 && t.length <= 1000;
}

// Schedule must be 8 digits (date only) or 16 digits (date + start + end time)
function validateSchedule(s) {
    if (s === undefined || s === null || s === '') return true;
    return typeof s === 'string' && /^\d{8}(\d{8})?$/.test(s);
}

// --- Session management ---

function createSession(username) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, username);
    return token;
}

function resolveToken(token) {
    if (typeof token !== 'string') return null;
    return sessions.get(token) ?? null;
}

function deleteSession(token) {
    sessions.delete(token);
}

// --- Encryption ---

function encryptString(value) {
    if (typeof value !== 'string') return value;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', TASK_ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${ENC_PREFIX}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptString(value) {
    if (typeof value !== 'string' || !value.startsWith(`${ENC_PREFIX}:`)) return value;
    const parts = value.split(':');
    if (parts.length !== 5) return value;
    try {
        const iv = Buffer.from(parts[2], 'base64');
        const authTag = Buffer.from(parts[3], 'base64');
        const encrypted = Buffer.from(parts[4], 'base64');
        const decipher = crypto.createDecipheriv('aes-256-gcm', TASK_ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch {
        return value;
    }
}

// --- Persistence ---

function loadUsers() {
    try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
    catch { return []; }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function loadTasks() {
    try { return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8')); }
    catch { return {}; }
}

function saveTasks(tasks) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

function serializeTask(task) {
    const t = { ...task };
    if (typeof t.text === 'string') t.text = encryptString(t.text);
    if (typeof t.schedule === 'string') t.schedule = encryptString(t.schedule);
    return t;
}

function deserializeTask(task) {
    const t = { ...task };
    if (typeof t.text === 'string') t.text = decryptString(t.text);
    if (typeof t.schedule === 'string') t.schedule = decryptString(t.schedule);
    return t;
}

// --- Auth middleware helper ---

function requireAuth(token) {
    const username = resolveToken(token);
    return username;
}

// --- Routes ---

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!validateUsername(username)) {
            return res.status(400).json({ message: 'username must be 3–30 characters (letters, numbers, _ or -)' });
        }
        if (!validatePassword(password)) {
            return res.status(400).json({ message: 'password must be 8–128 characters' });
        }
        const users = loadUsers();
        if (users.find(u => u.username === username)) {
            return res.status(409).json({ message: 'username already taken' });
        }
        const passwordHash = await argon2.hash(password);
        users.push({ username, passwordHash });
        saveUsers(users);
        return res.status(201).json({ message: 'registered successfully' });
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ message: 'server error' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'missing username or password' });
        }
        const users = loadUsers();
        const user = users.find(u => u.username === username);
        // Use the same response for "user not found" and "wrong password" to prevent enumeration
        if (!user || !(await argon2.verify(user.passwordHash, password))) {
            return res.status(401).json({ message: 'invalid credentials' });
        }
        const token = createSession(username);
        return res.status(200).json({ message: 'logged in', token });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'server error' });
    }
});

app.post('/logout', (req, res) => {
    const { token } = req.body;
    if (token) deleteSession(token);
    return res.status(200).json({ message: 'logged out' });
});

app.post('/add_task', (req, res) => {
    try {
        const { token, task, schedule } = req.body;
        if (!token || !task) {
            return res.status(400).json({ message: 'missing token or task' });
        }
        if (!validateTaskText(task)) {
            return res.status(400).json({ message: 'task text must be 1–1000 characters' });
        }
        if (!validateSchedule(schedule)) {
            return res.status(400).json({ message: 'invalid schedule format (expected 8 or 16 digits)' });
        }
        const username = requireAuth(token);
        if (!username) return res.status(401).json({ message: 'invalid or expired token' });
        const tasks = loadTasks();
        if (!tasks[username]) tasks[username] = [];
        const newTask = { id: Date.now(), text: task };
        if (schedule) newTask.schedule = schedule;
        tasks[username].push(serializeTask(newTask));
        saveTasks(tasks);
        return res.status(201).json({ message: 'task added', task: newTask });
    } catch (err) {
        console.error('Add task error:', err);
        return res.status(500).json({ message: 'server error' });
    }
});

app.post('/get_all_tasks', (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'missing token' });
        const username = requireAuth(token);
        if (!username) return res.status(401).json({ message: 'invalid or expired token' });
        const tasks = loadTasks();
        const userTasks = (tasks[username] || []).map(deserializeTask);
        return res.status(200).json({ message: 'tasks fetched', tasks: userTasks });
    } catch (err) {
        console.error('Get tasks error:', err);
        return res.status(500).json({ message: 'server error' });
    }
});

app.post('/get_task', (req, res) => {
    try {
        const { token, id } = req.body;
        if (!token || !id) return res.status(400).json({ message: 'missing token or id' });
        const username = requireAuth(token);
        if (!username) return res.status(401).json({ message: 'invalid or expired token' });
        const tasks = loadTasks();
        const task = (tasks[username] || []).find(t => t.id === Number(id));
        if (!task) return res.status(404).json({ message: 'task not found' });
        return res.status(200).json({ message: 'task fetched', task: deserializeTask(task) });
    } catch (err) {
        console.error('Get task error:', err);
        return res.status(500).json({ message: 'server error' });
    }
});

app.post('/edit_task', (req, res) => {
    try {
        const { token, oldTask, newTask } = req.body;
        if (!token || !oldTask || !newTask) {
            return res.status(400).json({ message: 'missing token, oldTask, or newTask' });
        }
        if (!oldTask.id || !newTask.id || oldTask.id !== newTask.id) {
            return res.status(400).json({ message: 'task IDs missing or do not match' });
        }
        if (!validateTaskText(newTask.text)) {
            return res.status(400).json({ message: 'task text must be 1–1000 characters' });
        }
        if (!validateSchedule(newTask.schedule)) {
            return res.status(400).json({ message: 'invalid schedule format (expected 8 or 16 digits)' });
        }
        const username = requireAuth(token);
        if (!username) return res.status(401).json({ message: 'invalid or expired token' });
        const tasks = loadTasks();
        const userTasks = tasks[username] || [];
        const index = userTasks.findIndex(t => t.id === Number(oldTask.id));
        if (index === -1) return res.status(404).json({ message: 'task not found' });
        userTasks[index] = serializeTask(newTask);
        tasks[username] = userTasks;
        saveTasks(tasks);
        return res.status(200).json({ message: 'task updated', task: newTask });
    } catch (err) {
        console.error('Edit task error:', err);
        return res.status(500).json({ message: 'server error' });
    }
});

app.post('/delete_task', (req, res) => {
    try {
        const { token, id } = req.body;
        if (!token || !id) return res.status(400).json({ message: 'missing token or id' });
        const username = requireAuth(token);
        if (!username) return res.status(401).json({ message: 'invalid or expired token' });
        const tasks = loadTasks();
        const userTasks = tasks[username] || [];
        const index = userTasks.findIndex(t => t.id === Number(id));
        if (index === -1) return res.status(404).json({ message: 'task not found' });
        const removed = userTasks.splice(index, 1)[0];
        tasks[username] = userTasks;
        saveTasks(tasks);
        return res.status(200).json({ message: 'task deleted', deleted: deserializeTask(removed) });
    } catch (err) {
        console.error('Delete task error:', err);
        return res.status(500).json({ message: 'server error' });
    }
});

app.post('/delete_all_tasks', (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'missing token' });
        const username = requireAuth(token);
        if (!username) return res.status(401).json({ message: 'invalid or expired token' });
        const tasks = loadTasks();
        const deletedTasks = (tasks[username] || []).map(deserializeTask);
        tasks[username] = [];
        saveTasks(tasks);
        return res.status(200).json({ message: 'all tasks deleted', deleted: deletedTasks });
    } catch (err) {
        console.error('Delete all tasks error:', err);
        return res.status(500).json({ message: 'server error' });
    }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}
module.exports = app;
