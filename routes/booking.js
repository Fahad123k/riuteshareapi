const express = require('express');
const protect = require("../middleware/middleware");  // Import middleware
const {
    createBooking,
    acceptbooking,
    getAllBookings,
    getBookingById
} = require('../controllers/bookingController');

const router = express.Router();

router.post('/book', protect, createBooking);
router.patch("accept/:id")
router.get('/all', getAllBookings)
router.get('/my-bookings', protect, getBookingById);


module.exports = router;