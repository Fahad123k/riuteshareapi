const mongoose = require("mongoose");
require("dotenv").config();

const DBURL = process.env.MONGO_URI;

// console.log("DB URL:", DBURL);

async function connectDB() {
    try {
        if (!DBURL?.trim()) {
            throw new Error("Environment variable URL is not set or empty");
        }

        await mongoose.connect(DBURL);

        console.log("MongoDB Connected Successfully");
    } catch (error) {
        console.error("MongoDB Connection Error:", error.message);
        process.exit(1); // Exit process with failure
    }
}

module.exports = connectDB;
