const mongoose = require("mongoose");

const journeySchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

        leaveFrom: {
            type: { type: String, default: "Point" }, // GeoJSON type
            coordinates: { type: [Number], required: true, index: "2dsphere" }, // [longitude, latitude]
        },

        goingTo: {
            type: { type: String, default: "Point" },
            coordinates: { type: [Number], required: true, index: "2dsphere" },
        },

        date: { type: Date, required: true },
        maxCapacity: { type: String, required: true },
        fareStart: { type: String, required: true },
        costPerKg: { type: String, required: true },
    },
    { timestamps: true }
);

journeySchema.index({ leaveFrom: "2dsphere" });
journeySchema.index({ goingTo: "2dsphere" });

module.exports = mongoose.model("Journey", journeySchema);
