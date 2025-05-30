const express = require('express');
const Journey = require("../models/Journey");
const router = express.Router();
const Message = require('../models/message');
const Vehicle = require('../models/Vehicle');
const protect = require("../middleware/middleware");
const verifyAdmin = require('../middleware/verifyAdmin')

const {
    registerUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    loginUser,
    createJourney,
    getAllJourney,
    getJourneyByID,
    updateUserByAdmin,
    updateUserRating,
    searchCities,
} = require("../controllers/userController");



router.get('/messages', protect, async (req, res) => {
    try {
        const userId = req.user._id; // Get from protected route
        const { receiverId } = req.query;

        if (!receiverId) {
            return res.status(400).json({ message: "Receiver ID is required" });
        }

        const messages = await Message.find({
            $or: [
                { senderId: userId, receiverId },
                { senderId: receiverId, receiverId: userId }
            ]
        })
            .sort({ createdAt: 1 })
            .populate('senderId', 'name email')
            .populate('receiverId', 'name email');

        res.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Error fetching messages" });
    }
});

router.post('/messages', protect, async (req, res) => {
    try {
        const senderId = req.user._id; // Get from protected route
        const { receiverId, text } = req.body;

        if (!receiverId || !text) {
            return res.status(400).json({ message: "Receiver ID and text are required" });
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text
        });

        const savedMessage = await newMessage.save();

        // Populate sender info before sending back
        const populatedMessage = await Message.findById(savedMessage._id)
            .populate('senderId', 'name email');

        // Emit socket event
        io.to(receiverId).emit('newMessage', populatedMessage);

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error("Error saving message:", error);
        res.status(500).json({ message: "Error saving message" });
    }
});


// router.post("/auth/verify", protect, async (req, res) => {
//     try {
//         // The protect middleware already verified the token
//         // Just return success if we got here
//         res.status(200).json({
//             valid: true,
//             userId: req.user._id // Assuming your protect middleware attaches the user
//         });
//     } catch (err) {
//         res.status(401).json({ error: 'Invalid token' });
//     }
// });


router.post("/register", registerUser);
router.post("/createJourney", protect, createJourney);  // Protect the route
router.post("/login", loginUser);

router.get("/users", getAllUsers);

router.get("/all-journey", getAllJourney);
router.get("/search", searchCities);
router.get("/:id", getUserById);
router.get('/journey/:id?', protect, getJourneyByID)
router.get('/get-journeyby-id/:id?', protect, async (req, res) => {  // Protect the route
    try {
        const id = req.params.id || req.query.id;

        if (!id) {
            return res.status(400).json({ error: "ID is required" });
        }

        const journey = await Journey.findById(id)
            .populate("userId", "-password -__v")
            .lean()
            .exec();

        if (!journey) {
            return res.status(404).json({ error: "Journey not found" });
        }

        res.json(journey);
    } catch (err) {
        res.status(500).json({ error: "Invalid ID format" });
    }
});







// // getsingle vehocle
router.get('/vehicle/:id', protect, async (req, res) => {
    try {


        const userId = req.params.id;
        // console.log(userId)
        const vehicle = await Vehicle.findOne({
            user: userId
        }).select('-__v');

        // const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return [];
        }

        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update vehicle
router.patch('/vehicle/:id', protect, async (req, res) => {
    try {
        const userId = req.params.id;
        // const userId = req.user.id;

        // console.log("usser id", req.params)
        // return;

        // Find vehicle that belongs to this user
        const vehicle = await Vehicle.findOne({
            user: userId
        }).select('-__v');

        if (!vehicle) {
            return res.status(404).json({
                message: 'Vehicle not found or unauthorized access'
            });
        }

        // Prepare update object directly from req.body
        const updateData = {
            ...req.body,
            capacity: req.body.capacity ? Number(req.body.capacity) : undefined
        };

        // Remove undefined fields to prevent overwriting existing data
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined || updateData[key] === '') {
                delete updateData[key];
            }
        });

        const updatedVehicle = await Vehicle.findByIdAndUpdate(
            userId,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).select('-__v');

        res.json({
            message: 'Vehicle updated successfully',
            vehicle: updatedVehicle
        });
    } catch (err) {
        console.error('Error updating vehicle:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                errors: Object.values(err.errors).map(e => e.message)
            });
        }

        res.status(500).json({
            message: 'Server error while updating vehicle',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

});

router.put("/update", protect, updateUser);
router.patch("/update/:userId", verifyAdmin, updateUserByAdmin);
router.patch("/updaterating/:userId", updateUserRating);
router.delete("/delete/:userId", verifyAdmin, deleteUser);

module.exports = router;
