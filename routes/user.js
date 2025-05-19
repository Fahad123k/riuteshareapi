const express = require('express');
const Journey = require("../models/Journey");
const router = express.Router();

const protect = require("../middleware/middleware");  // Import middleware

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
    searchCities,
} = require("../controllers/userController");

router.post("/register", registerUser);
router.post("/createJourney", protect, createJourney);  // Protect the route
router.post("/login", loginUser);

router.get("/all-user", getAllUsers);
router.get("/all-journey", getAllJourney);
router.get("/search", searchCities);
router.get("/:id", getUserById);
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
router.delete("/:id", deleteUser);

module.exports = router;
