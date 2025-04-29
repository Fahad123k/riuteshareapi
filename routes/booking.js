const express = require('express');
const protect = require("../middleware/middleware");  // Import middleware
const {
    createBooking,
    updateBookingStatus,
    getAllBookings,
    getBookingById,
    getRequestsReceived
} = require('../controllers/bookingController');

const router = express.Router();

router.post('/book', protect, createBooking);
router.patch("accept/:id")
router.get('/all', getAllBookings)
router.get('/my-bookings', protect, getBookingById);
router.patch('/booking/:id/status', protect, updateBookingStatus);

router.patch('/:id/status', protect, updateBookingStatus); // ✅ This is essential

module.exports = router;

// router.get('/update-status', protect, updateBookingStatus);
router.get('/requests-received', protect, getRequestsReceived);


module.exports = router;