const mongoose = require("mongoose");

const journeySchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

        leaveFrom: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },

        },

        goingTo: {

            lat: { type: Number, required: true },
            lng: { type: Number, required: true },

        },

        date: { type: Date, required: true },
        arrivalDate: { type: Date, required: false },
        departureTime: { type: String, required: false },
        arrivalTime: { type: String, required: false },

        maxCapacity: { type: String, required: true },
        fareStart: { type: String, required: true },
        costPerKg: { type: String, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Journey", journeySchema);
