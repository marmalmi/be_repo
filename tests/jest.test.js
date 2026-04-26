const request = require('supertest');
const app = require('../server/server'); // export your Express app from server.js

describe('Task API', () => {
    let token;

    beforeAll(async () => {
        // Register and login a test user
        await request(app).post('/register').send({ username: 'testuser', password: 'secret' });
        const res = await request(app).post('/login').send({ username: 'testuser', password: 'secret' });
        token = Buffer.from('testuser').toString('base64'); // matches your token system
    });

    test('adds a task', async () => {
        const res = await request(app)
            .post('/add_task')
            .send({ token, task: 'Write tests' });
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('task added');
    });

    test('fetches all tasks', async () => {
        const res = await request(app)
            .post('/get_all_tasks')
            .send({ token });
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.tasks)).toBe(true);
    });

    test('deletes all tasks', async () => {
        const res = await request(app)
            .post('/delete_all_tasks')
            .send({ token });
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('all tasks deleted');
    });
});
