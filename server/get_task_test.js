require('dotenv').config();

const PORT = process.env.PORT || 3000;

const token = Buffer.from("admin").toString("base64");
const id = 1775548190919;

async function testGetTask() {
    try {
        const response = await fetch(`http://localhost:${PORT}/get_task`, {
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

testGetTask();
