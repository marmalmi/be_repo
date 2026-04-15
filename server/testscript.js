
// Fill these in manually for testing
const username = "admin";
const password = "admin";

const POST = 3000;
// Your backend URL
const url = `http://localhost:${POST}/login`;

async function testLogin() {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        console.log("Status:", response.status);
        console.log("Response:", data);

    } catch (err) {
        console.error("Error sending request:", err);
    }
}

testLogin();
