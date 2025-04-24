const express = require('express');

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
router.post("/createJourney", createJourney);
router.post("/login", loginUser);


router.get("/all-user", getAllUsers);
router.get("/all-journey", getAllJourney);
router.get("/search", searchCities);
router.get("/:id", getUserById);
router.get("/journey-by-id:id", getJourneyByID);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
module.exports = router;








