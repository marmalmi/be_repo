// task_add_test.js

// Built-in fetch (Node 18+)
const token = Buffer.from("admin").toString("base64"); // simulate login token
const task = "brew coffee";
const schedule = "2028020311001400" // example schedule (2028, 2nd of march, 11:00 - 14:00)

async function testAddTask() {
    try {
        const response = await fetch("http://localhost:3000/add_task", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, task, schedule })
        });

        const data = await response.json();

        console.log("Status:", response.status);
        console.log("Response:", data);

    } catch (err) {
        console.error("Error:", err);
    }
}

testAddTask();
