// task_add_test.js

// Built-in fetch (Node 18+)
const token = Buffer.from("admin").toString("base64"); // simulate login token
const task = "brew coffee";

async function testAddTask() {
    try {
        const response = await fetch("http://localhost:3000/add_task", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, task })
        });

        const data = await response.json();

        console.log("Status:", response.status);
        console.log("Response:", data);

    } catch (err) {
        console.error("Error:", err);
    }
}

testAddTask();
