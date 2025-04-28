const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const Router = require("./routes/index");
const cors = require("cors");

const { Server } = require('socket.io')
const http = require('http')

dotenv.config(); // Load environment variables
const PORT = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app)

const corsdata = {
    origin: ["http://localhost:5173", "https://route-share-front.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}
const io = new Server(server, {
    cors: corsdata
})

// CORS Configuration
app.use(cors(
    corsdata
));
// Middleware
app.use(express.json());

// Routes
app.use("/", Router);


// handle soket io connection
io.on('connection', (socket) => {
    console.log(` New user connected ${socket.id}`)
    socket.on("disconnect", () => {
        console.log(`User disconnected ${socket.id}`)
    })

})

// Start the Server ONLY after a successful DB connection
const startServer = async () => {
    try {
        await connectDB(); // Ensure DB is connected before starting server
        server.listen(PORT, () => {
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
module.exports = { app, io };
