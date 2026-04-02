const express = require("express");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Server running");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} http://localhost:5000/`);
});
