const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        console.log("⏳ Connecting to MongoDB...");
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("❌ MongoDB Connection Failed:", error);
        process.exit(1); // Stop app if DB connection fails
    }
};

module.exports = connectDB;
