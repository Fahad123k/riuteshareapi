const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const Router = require("./routes/index");
const cors = require("cors");

dotenv.config(); // Load environment variables
const PORT = process.env.PORT || 8000;

const app = express();

// CORS Configuration
app.use(cors({
    origin: ["http://localhost:5173", "https://your-frontend.vercel.app"], // Update with your frontend URL
    credentials: true,
}));

// Middleware
app.use(express.json());

// Routes
app.use("/", Router);

app.listen(PORT, async () => {
    try {
        const res = await connectDB();

    } catch (error) {
        console.error("❌ Failed to connect to the database:", error);
    }
    console.log(`🚀 Server is running on port ${PORT}`);
});

// Connect to DB


// Export app for Vercel (instead of using app.listen)
module.exports = app;
