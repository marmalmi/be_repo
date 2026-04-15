require('dotenv').config();

const PORT = process.env.PORT || 3000;

const token = Buffer.from("admin").toString("base64");

async function testDeleteAllTasks() {
    try {
        const response = await fetch(`http://localhost:${PORT}/delete_all_tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
        });

        const data = await response.json();

        console.log("Status:", response.status);
        console.log("Response:", data);

    } catch (err) {
        console.error("Error:", err);
    }
}

testDeleteAllTasks();
