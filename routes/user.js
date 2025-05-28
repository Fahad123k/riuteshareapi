const express = require('express');
const Journey = require("../models/Journey");
const router = express.Router();
const Message = require('../models/message');

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

router.put("/update", protect, updateUser);
router.patch("/update/:userId", verifyAdmin, updateUserByAdmin);
router.patch("/updaterating/:userId", updateUserRating);
router.delete("/delete/:userId", verifyAdmin, deleteUser);

module.exports = router;
