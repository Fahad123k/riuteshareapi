const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const Router = require("./routes/index");
const cors = require("cors");
const http = require('http');

dotenv.config();
const PORT = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app); // Create HTTP server with Express app

// CORS Configuration
const corsOptions = {
    origin: ["http://localhost:5173", "https://route-share-front.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize Socket.io
const io = require('./socket')(server); // Pass the server instance to socket.js

// Routes
app.use("/", Router);

// Store io instance in app for route access if needed
app.set('io', io);

const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Failed to connect to the database:", error);
        process.exit(1);
    }
};

if (process.env.NODE_ENV !== "production") {
    startServer();
}

module.exports = { app, server }; // Export both for Vercel