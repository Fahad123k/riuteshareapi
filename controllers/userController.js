const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Journey = require("../models/Journey")
const axios = require("axios");


const createJourney = async (req, res) => {
    try {
        const {
            userId,
            leaveFrom,
            goingTo,
            date,
            arrivalDate,
            departureTime,
            arrivalTime,
            maxCapacity,
            fareStart,
            costPerKg
        } = req.body;

        console.log("Received Data:", req.body);

        // Check if userId is present
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        if (
            !leaveFrom || typeof leaveFrom !== 'object' ||
            leaveFrom.lat === undefined || leaveFrom.lng === undefined
        ) {
            return res.status(400).json({ success: false, message: "Valid leaveFrom position is required" });
        }

        if (
            !goingTo || typeof goingTo !== 'object' ||
            goingTo.lat === undefined || goingTo.lng === undefined
        ) {
            return res.status(400).json({ success: false, message: "Valid goingTo position is required" });
        }


        // Validate other required fields
        const requiredFields = { date, maxCapacity, fareStart, costPerKg };
        for (const [key, value] of Object.entries(requiredFields)) {
            if (value === undefined || value === null || value === '') {
                return res.status(400).json({ success: false, message: `${key} is required` });
            }
        }

        // Create a new journey
        const journey = new Journey({
            userId,
            leaveFrom,
            goingTo,
            date,
            arrivalDate,
            departureTime,
            arrivalTime,
            maxCapacity,
            fareStart,
            costPerKg,
        });

        await journey.save();
        console.log("journey created succesfully")
        res.status(201).json({ success: true, message: "Journey Published successfully", journey });

    } catch (error) {
        console.error("Journey Creation Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// const getAllJourney = async (req, res) => {

//     try {
//         const alljourney = await Journey.find()

//         if (alljourney == null || alljourney.length === 0) {
//             res.status(500).json({ success: false, message: "No  journeys found, Please create one first" });
//         }
//         // .populate("userId", "-password -__v")
//         // .lean()
//         // console.log(JSON.parse(alljourney))

//         res.status(200).json(alljourney);

//     } catch (error) {
//         console.error("Error while fetchn=ing journies", error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// }




const getLocation = async (lat, lng) => {
    try {
        const response = await axios.get("https://revgeocode.search.hereapi.com/v1/revgeocode", {
            params: {
                at: `${lat},${lng}`,
                apiKey: process.env.HERE_API_KEY, // Store API key in environment variable
            },
        });

        if (response.data.items.length > 0) {
            return response.data.items[0].address.label;
        } else {
            return "Unknown Location";
        }
    } catch (error) {
        console.error("Error fetching location:", error);
        return "Unknown Location";
    }
};

const getAllJourney = async (req, res) => {
    try {
        const allJourneys = await Journey.find();

        if (!allJourneys || allJourneys.length === 0) {
            return res.status(404).json({ success: false, message: "No journeys found" });
        }

        // Fetch locations for each journey
        const updatedJourneys = await Promise.all(
            allJourneys.map(async (journey) => {
                const leaveFrom = await getLocation(journey.leaveFrom.lat, journey.leaveFrom.lng);
                const goingTo = await getLocation(journey.goingTo.lat, journey.goingTo.lng);

                return {
                    ...journey._doc, // Spread the existing journey data
                    leaveFrom, // Replace lat/lng with formatted address
                    goingTo,   // Replace lat/lng with formatted address
                };
            })
        );

        res.status(200).json(updatedJourneys);
    } catch (error) {
        console.error("Error fetching journeys:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};



const getJourneyByID = async (req, res) => {

    try {
        const alljourney = await Journey.find()
            .populate("userId", "-password -__v")
            .lean()

        if (alljourney == null || alljourney.length === 0) {
            res.status(500).json({ success: false, message: "No  journeys found, Please create one first" });
        }

        console.log(alljourney)

        res.status(200).json(alljourney);

    } catch (error) {
        console.error("Error while fetchn=ing journies", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        // Check if user already exists
        console.time("findUser");
        const user = await User.findOne({ email }).lean();
        console.timeEnd("findUser");

        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash password
        console.time("hashPassword");
        const saltRounds = parseInt(process.env.SALT_ROUNDS) || 8;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.timeEnd("hashPassword");

        // Create and save user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
        });

        console.time("saveUser");
        await newUser.save();
        console.timeEnd("saveUser");

        res.status(201).json({ message: "User registered successfully" });

    } catch (error) {
        console.error("❌ Error registering user:", error);
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: "Validation error", details: error.message });
        }
        res.status(500).json({ message: "Server error" });
    }
};

// Helper function for email validation
const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// const loginUser = async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         // Validate input fields
//         if (!email || !password) {
//             return res.status(400).json({ success: false, message: "Email and password are required" });
//         }

//         // Check if user exists
//         const user = await User.findOne({ email });
//         if (!user) {
//             return res.status(400).json({ success: false, message: "Invalid email or password" });
//         }

//         // Compare passwords
//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) {
//             return res.status(400).json({ success: false, message: "Invalid email or password" });
//         }

//         // Generate JWT Token
//         const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//             expiresIn: "1h",
//         });

//         res.status(200).json({
//             success: true,
//             message: "Login successful",
//             token,
//             user: {
//                 id: user._id,
//                 name: user.name,
//                 email: user.email,
//             },
//         });

//     } catch (error) {
//         res.status(500).json({ success: false, error: error.message });
//     }
// };

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input fields
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        // Check if user exists
        const user = await User.findOne({ email }).lean();
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid email or password" });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid email or password" });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { id: user._id, email: user.email }, // Payload
            process.env.JWT_SECRET, // Secret key
            { expiresIn: process.env.JWT_EXPIRES_IN || "1h" } // Expiration time
        );

        // Remove sensitive data from the user object
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
        };

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: userResponse,
        });

    } catch (error) {
        console.error("❌ Error during login:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const updateUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Hash password if updating
        let updatedFields = { name, email };
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updatedFields.password = await bcrypt.hash(password, salt);
        }

        const user = await User.findByIdAndUpdate(req.params.id, updatedFields, {
            new: true,
            runValidators: true,
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "User updated successfully", user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const publish = async (req, res) => {

}

module.exports = {
    registerUser,
    loginUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    createJourney,
    getAllJourney,
    getJourneyByID
};
