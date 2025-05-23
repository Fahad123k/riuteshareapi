const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    number: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    }
    ,
    isVerified: {
        type: Boolean,
        default: false // false = not verified, true = verified
    },

    role: {
        type: String,
        enum: ["user", "admin"], // restricts to these values
        default: "user"
    },
    vehicles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle"
    }]

}, { timestamps: true });


module.exports = mongoose.model("User", userSchema)