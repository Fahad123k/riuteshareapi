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
    origin: ["http://localhost:5173", "https://route-share-front.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
// Middleware
app.use(express.json());

// Routes
app.use("/", Router);

// Start the Server ONLY after a successful DB connection
const startServer = async () => {
    try {
        await connectDB(); // Ensure DB is connected before starting server
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Failed to connect to the database:", error);
        process.exit(1); // Exit the process if DB connection fails
    }
};

// Start server only in local environment (not needed in Vercel)
if (process.env.NODE_ENV !== "production") {
    startServer();
}

// Export app for Vercel (Vercel handles server start)
module.exports = app;
