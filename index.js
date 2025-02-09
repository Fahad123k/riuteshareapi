const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const Router = require("./routes/index");

const cors = require('cors')
dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,  // Allow cookies if needed
}));


// Middleware
app.use(express.json());

// Routes
app.use("/", Router);

// Connect to DB and Start Server
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Failed to connect to the database:", error);
        process.exit(1); // Exit process if DB connection fails
    }
};

startServer();
