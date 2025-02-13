const mongoose = require("mongoose");

const journeySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to User model
    leaveFrom: { type: String, required: true },
    goingTo: { type: String, required: true },
    date: { type: Date, required: true },
    arrivalDate: { type: Date, required: true },
    departureTime: { type: String, required: true },
    arrivalTime: { type: String, required: true },
    maxCapacity: { type: String, required: true },
    fareStart: { type: String, required: true },
    costPerKg: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Journey", journeySchema);
