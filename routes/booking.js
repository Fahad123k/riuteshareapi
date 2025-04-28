const express = require('express');
const protect = require("../middleware/middleware");  // Import middleware
const {
    createBooking,
    acceptbooking,
    getAllBookings,
    getBookingById,
    getRequestsReceived
} = require('../controllers/bookingController');

const router = express.Router();

router.post('/book', protect, createBooking);
router.patch("accept/:id")
router.get('/all', getAllBookings)
router.get('/my-bookings', protect, getBookingById);
router.get('/booking-update', protect, acceptbooking);
router.get('/requests-received', protect, getRequestsReceived);


module.exports = router;