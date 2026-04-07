require('dotenv').config();

const PORT = process.env.PORT || 3000;

const token = Buffer.from("admin").toString("base64");

// Example old + new task objects
const oldTask = {
    id: 1775552851322,
    text: "brew coffee",
    schedule: "2028020311001400"
};

const newTask = {
    id: 1775552851322,
    text: "brew stronger coffee",
    schedule: "2028020212001500"
};

async function testEditTask() {
    try {
        const response = await fetch(`http://localhost:${PORT}/edit_task`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, oldTask, newTask })
        });

        const data = await response.json();

        console.log("Status:", response.status);
        console.log("Response:", data);

    } catch (err) {
        console.error("Error:", err);
    }
}

testEditTask();
