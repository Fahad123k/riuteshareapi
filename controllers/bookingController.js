const Booking = require('../models/Booking');
const Journey = require('../models/Journey.js');
const { io } = require('../index');


//create a new booking 
const createBooking = async (req, res) => {
    try {
        // Log the request body to check if the data is being sent properly
        console.log("Booking Request Body:", req.body);

        const { journeyId } = req.body; // Assuming you're getting `journeyId` from the request body

        if (!journeyId) {
            return res.status(400).json({ message: "Journey ID is required" });
        }

        // Ensure the user is logged in by checking if req.user is set (from the token)
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized - User ID missing" });
        }

        // Check if a booking already exists for the given user and journey
        const existingBooking = await Booking.findOne({
            userId: req.user.id,
            journeyId: journeyId,
            status: { $ne: 'rejected' } // Only check for bookings that are not rejected
        });

        if (existingBooking) {
            return res.status(400).json({ message: "You already have a booking for this journey" });
        }

        // Create a new booking instance with the provided data
        const newBooking = new Booking({
            userId: req.user.id,  // Assuming you're using a user from a JWT token
            journeyId: journeyId,
            status: "pending", // default status
        });

        // Save the new booking to the database
        await newBooking.save();

        // Respond with a success message
        res.status(201).json({
            message: "Booking created successfully",
            data: newBooking,
        });
    } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// Accepting  a booking 
const acceptbooking = async (req, res) => {

    try {

        const { id } = req.params;
        const booking = await Booking.findById(id);

        if (!booking) return res.status(404).json({ success: false, message: 'booking not found' })

        booking.status = 'accepted';

        await booking.save();

        io.emit("bookingAccepted", {
            bookingId: booking._id,
            userId: booking.userId
        })

        res.status(200).json({ success: true, message: "Booking accepted" })

    } catch (error) {
        console.log("Error while accept a booking:", error)
        res.status(500).json({ succes: false, message: "Server Error" })

    }
}

// for admin get all bookings

const getAllBookings = async (req, res) => {
    try {

        const bookings = await Booking.find()
            .populate('userID', 'name email')
            .populate('journeyId', "leaveFrom goingTo")
            .sort({ createdAt: -1 })

        res.status(200).json({ succes: true, bookings })

    } catch (error) {
        console.log("Error while fetching bookings:", error)
        res.status(500).json({ succes: false, message: "Server Error" })
    }
}


const getBookingById = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user.id }).populate('journeyId').exec();
        res.status(200).json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Server Error' });
    }
}

const getRequestsReceived = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find all journeys created by this user
        const myJourneys = await Journey.find({ createdBy: userId }).select('_id');

        const journeyIds = myJourneys.map(journey => journey._id);

        // Find bookings made for the journeys you posted
        const requestsReceived = await Booking.find({ journeyId: { $in: journeyIds } })
            .populate('journeyId')
            .populate('user') // who made the request
            .sort({ createdAt: -1 });

        res.json(requestsReceived);
    } catch (error) {
        console.error('Error fetching requests received:', error);
        res.status(500).json({ message: 'Server Error while fetching requests received' });
    }
};



module.exports = {
    createBooking,
    acceptbooking,
    getAllBookings,
    getBookingById,
    getRequestsReceived
}