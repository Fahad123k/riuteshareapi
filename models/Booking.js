const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    requestedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    journeyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Journey',
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});




const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
