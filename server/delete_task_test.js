require('dotenv').config();

const PORT = process.env.PORT || 3000;

const token = Buffer.from("admin").toString("base64");
const id = 1775550096176;

async function testDeleteTask() {
    try {
        const response = await fetch(`http://localhost:${PORT}/delete_task`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, id })
        });

        const data = await response.json();

        console.log("Status:", response.status);
        console.log("Response:", data);

    } catch (err) {
        console.error("Error:", err);
    }
}

testDeleteTask();
