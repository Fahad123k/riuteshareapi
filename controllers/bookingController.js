const Booking = require('../models/Booking');
const Journey = require('../models/Journey');
const { io } = require('../socket');  // Import from socket.js

const createBooking = async (req, res) => {
    try {
        console.log("Booking Request Body:", req.body);
        const { journeyId } = req.body;

        if (!journeyId) {
            return res.status(400).json({ message: "Journey ID is required" });
        }

        if (!req.user?.id) {
            return res.status(401).json({ message: "Unauthorized - Please log in" });
        }

        // Journey verification
        const journey = await Journey.findById(journeyId);
        if (!journey) {
            return res.status(404).json({ message: "Journey not found" });
        }

        // Prevent booking own journey
        if (journey.userId.toString() === req.user.id) {
            return res.status(400).json({ message: "You cannot book your own journey" });
        }

        const receiverUserId = journey.userId.toString(); // Changed from createdBy to userId

        // Check for existing booking
        const existingBooking = await Booking.findOne({
            requestedBy: req.user.id,
            journeyId,
            status: { $nin: ['rejected', 'cancelled'] }
        });

        if (existingBooking) {
            return res.status(409).json({
                message: "Booking already exists",
                existingBooking
            });
        }

        // Create new booking
        const newBooking = new Booking({
            requestedBy: req.user.id,
            requestedTo: receiverUserId,
            journeyId,
            status: "pending",
            createdAt: new Date()
        });

        await newBooking.save();

        // Emit socket.io event to receiver (journey owner)
        try {
            const receiverSockets = await io.fetchSockets();
            const targetSocket = receiverSockets.find(
                socket => socket.userId === receiverUserId
            );

            if (targetSocket) {
                io.to(targetSocket.id).emit('booking-request', {
                    bookingId: newBooking._id,
                    journeyId,
                    senderId: req.user.id,
                    status: 'pending',
                    timestamp: new Date()
                });
                console.log(`Booking notification sent to user ${receiverUserId}`);
            } else {
                console.warn(`User ${receiverUserId} not currently connected`);
            }
        } catch (socketError) {
            console.error("Socket notification failed:", socketError);
            // Proceed even if socket fails
        }

        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            booking: newBooking
        });

    } catch (error) {
        console.error("Booking creation error:", {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            journeyId: journeyId
        });

        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


// Accepting  a booking 
// In your backend controller
const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        // Find booking and populate necessary data
        const booking = await Booking.findById(id)
            .populate('journeyId', 'userId')
            .populate('requestedBy', '_id');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Verify authorization (user is either journey owner or booking requester)
        const isJourneyOwner = booking.journeyId.userId.toString() === userId;
        const isRequester = booking.requestedBy._id.toString() === userId;

        if (!isJourneyOwner && !isRequester) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to update this booking'
            });
        }

        // Validate status transition
        if (booking.status === 'accepted' && status === 'rejected') {
            return res.status(400).json({
                success: false,
                message: 'Cannot reject an already accepted booking'
            });
        }

        // Update booking
        booking.status = status;
        booking.updatedAt = new Date();
        await booking.save();

        // Additional logic for accepted bookings (e.g., decrease available seats)
        if (status === 'accepted' && isJourneyOwner) {
            await Journey.findByIdAndUpdate(
                booking.journeyId._id,
                { $inc: { availableSeats: -1 } }
            );
        }

        // Prepare response
        const response = {
            success: true,
            message: `Booking ${status} successfully`,
            booking: {
                _id: booking._id,
                status: booking.status,
                journeyId: booking.journeyId._id,
                requestedBy: booking.requestedBy._id
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Booking status update error:', {
            error: error.message,
            stack: error.stack,
            params: req.params,
            body: req.body,
            userId: req.user?.id
        });

        res.status(500).json({
            success: false,
            message: 'Failed to update booking status',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
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
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized - Please log in" });
        }

        const bookings = await Booking.find({
            $or: [
                { requestedBy: userId },  // Bookings I made
                { requestedTo: userId }    // Bookings I received
            ]
        })
            .populate({
                path: 'journeyId',
                select: 'name departureTime leaveFrom goingTo availableSeats fareStart userId',
                populate: [
                    { path: 'leaveFrom', select: 'address coordinates' },
                    { path: 'goingTo', select: 'address coordinates' },
                    { path: 'userId', select: 'name email profileImage' }
                ]
            })
            .populate({
                path: 'requestedBy',
                select: 'name email profileImage'
            })
            .populate({
                path: 'requestedTo',
                select: 'name email profileImage'
            })
            .sort({ createdAt: -1 })  // Newest first
            .lean();

        if (!bookings || bookings.length === 0) {
            return res.status(200).json([]);
        }

        // Transform data for better client consumption
        const formattedBookings = bookings.map(booking => ({
            _id: booking._id,
            status: booking.status,
            createdAt: booking.createdAt,
            journey: booking.journeyId ? {
                _id: booking.journeyId._id,
                name: booking.journeyId.name,
                departureTime: booking.journeyId.departureTime,
                from: booking.journeyId.leaveFrom,
                to: booking.journeyId.goingTo,
                seats: booking.journeyId.availableSeats,
                fare: booking.journeyId.fareStart,
                driver: booking.journeyId.userId
            } : null,
            passenger: booking.requestedBy,
            driver: booking.requestedTo
        }));

        res.status(200).json(formattedBookings);
    } catch (error) {
        console.error('Error fetching bookings:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        res.status(500).json({
            message: 'Failed to fetch bookings',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
// controllers/bookingController.js

const getRequestsReceived = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized - Please log in" });
        }

        // Find all journeys created by this user (only IDs needed)
        const journeyIds = await Journey.find({ userId }).distinct('_id');

        if (!journeyIds?.length) {
            return res.json([]); // Return empty array if no journeys found
        }

        // Get bookings with detailed population
        const requestsReceived = await Booking.find({
            journeyId: { $in: journeyIds },
            status: { $ne: 'cancelled' } // Optionally filter out cancelled requests
        })
            .populate({
                path: 'journeyId',
                select: 'name departureTime leaveFrom goingTo availableSeats fareStart', // Only select needed fields
                populate: [
                    { path: 'leaveFrom', select: 'address coordinates' },
                    { path: 'goingTo', select: 'address coordinates' }
                ]
            })
            .populate({
                path: 'requestedBy',  // Changed from 'userId' to match your schema
                select: 'name email phone profileImage'  // Only essential user info
            })
            .sort({ createdAt: -1 }) // Newest first
            .lean(); // Convert to plain JS objects for better performance

        // Transform data for better client-side consumption
        const formattedRequests = requestsReceived.map(request => ({
            _id: request._id,
            status: request.status,
            createdAt: request.createdAt,
            journey: {
                _id: request.journeyId._id,
                name: request.journeyId.name,
                departureTime: request.journeyId.departureTime,
                from: request.journeyId.leaveFrom,
                to: request.journeyId.goingTo,
                // seats: request.journeyId.availableSeats,
                fare: request.journeyId.fareStart
            },
            passenger: request.requestedBy ? {
                _id: request.requestedBy._id,
                name: request.requestedBy.name,
                email: request.requestedBy.email,
                phone: request.requestedBy.phone,
                // profileImage: request.requestedBy.profileImage
            } : null
        }));

        res.json(formattedRequests);
    } catch (error) {
        console.error('Error fetching requests received:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        res.status(500).json({
            message: 'Failed to fetch booking requests',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


module.exports = {
    createBooking,
    updateBookingStatus,
    getAllBookings,
    getBookingById,
    getRequestsReceived
}