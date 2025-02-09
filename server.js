const app = require("./index"); // Import app from index.js

const PORT = process.env.PORT || 8000;

// ✅ Run the server locally (only when using `node server.js`)
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
