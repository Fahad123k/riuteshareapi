// models/Vehicle.js
const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    make: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    licensePlate: {
        type: String,
        required: true,
        unique: true
    },
    capacity: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ["car", "bike", "truck", "van", "bus", "scooter", "other"],
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Vehicle", vehicleSchema);
