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
    getAllJourney
} = require("../controllers/userController");

router.post("/register", registerUser);
router.post("/createJourney", createJourney);
router.post("/login", loginUser);


router.get("/all-user", protect, getAllUsers);
router.get("/all-journey", getAllJourney);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
module.exports = router;





