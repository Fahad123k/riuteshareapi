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

        // Validate required fields
        if (!userId) return res.status(400).json({ success: false, message: "User ID is required" });

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

        const requiredFields = { date, maxCapacity, fareStart, costPerKg };
        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                return res.status(400).json({ success: false, message: `${key} is required` });
            }
        }

        // ✅ Store location as GeoJSON format
        const journey = new Journey({
            userId,
            leaveFrom: {
                type: "Point",
                coordinates: [leaveFrom.lng, leaveFrom.lat] // GeoJSON format: [longitude, latitude]
            },
            goingTo: {
                type: "Point",
                coordinates: [goingTo.lng, goingTo.lat] // GeoJSON format
            },
            date,
            arrivalDate,
            departureTime,
            arrivalTime,
            maxCapacity,
            fareStart,
            costPerKg,
        });

        await journey.save();
        console.log("Journey created successfully");

        res.status(201).json({ success: true, message: "Journey published successfully", journey });

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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const locationCache = new Map(); // Cache to store fetched locations

const getLocation = async (lat, lng) => {
    const key = `${lat},${lng}`;
    if (locationCache.has(key)) {
        return locationCache.get(key); // Return from cache if exists
    }

    await delay(500); // Add delay before making request

    try {
        const response = await axios.get("https://revgeocode.search.hereapi.com/v1/revgeocode", {
            params: {
                at: `${lat},${lng}`,
                apiKey: process.env.HERE_API_KEY,
            },
        });

        if (response.data.items.length > 0) {
            const address = response.data.items[0].address;
            locationCache.set(key, address); // Store in cache
            return address;
        } else {
            return "Unknown Location";
        }
    } catch (error) {
        console.error("Error fetching location:", error.response?.data || error.message);
        return "Unknown Location";
    }
};

const getJourneyNameByGeos = async (allJourneys) => {
    let updatedJourneys = [];
    for (let i = 0; i < allJourneys.length; i++) {
        const journey = allJourneys[i];
        await delay(i * 500); // Stagger requests to avoid rate limits
        const user = await User.findById(journey.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // console.log("res", user.name)
        const username = user.name;


        const leaveFromLat = journey.leaveFrom.coordinates[1]; // Latitude
        const leaveFromLng = journey.leaveFrom.coordinates[0]; // Longitude

        const goingToLat = journey.goingTo.coordinates[1]; // Latitude
        const goingToLng = journey.goingTo.coordinates[0]; // Longitude


        // console.log(leaveFromLat, leaveFromLng);

        const leaveFrom = await getLocation(leaveFromLat, leaveFromLng);
        const goingTo = await getLocation(goingToLat, goingToLng);

        updatedJourneys.push({
            ...journey._doc,
            username,
            leaveFrom,
            goingTo,
        });
    }

    return updatedJourneys;
}

// const getNameByID= async

const getAllJourney = async (req, res) => {
    try {
        const allJourneys = await Journey.find();

        // console.log(all)

        if (!allJourneys || allJourneys.length === 0) {
            return res.status(404).json({ success: false, message: "No journeys found" });
        }

        const updatedJourneys = await getJourneyNameByGeos(allJourneys)
        res.status(200).json(updatedJourneys);
    } catch (error) {
        console.error("Error fetching journeys:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


const getJourneyByID = async (req, res) => {
    try {
        const id = req.params.id || req.query.id;  // Checks both

        if (!id) {
            return res.status(400).json({ success: false, message: "Journey ID is required" });
        }

        const journey = await Journey.findById(id)
            .populate("userId", "-password -__v")
            .lean()
            .exec();

        if (!journey) {
            return res.status(404).json({ success: false, message: "Journey not found" });
        }

        res.status(200).json({ success: true, data: journey });
    } catch (error) {
        console.error("Error while fetching journey:", error);

        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: "Invalid journey ID format" });
        }

        res.status(500).json({ success: false, message: "Server Error" });
    }
};


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


// Search Journeys Based on Nearby Location
const searchCities = async (req, res) => {
    try {
        let { leaveFromLat, leaveFromLng, goingToLat, goingToLng } = req.query;
        console.log("params", req.query);


        if (!leaveFromLat || !leaveFromLng || !goingToLat || !goingToLng) {
            return res.status(400).json({ error: "Missing required parameters" });
        }

        // Convert to numbers
        leaveFromLat = parseFloat(leaveFromLat);
        leaveFromLng = parseFloat(leaveFromLng);
        goingToLat = parseFloat(goingToLat);
        goingToLng = parseFloat(goingToLng);

        const maxDistanceKm = 5; // Search within 5 km
        const radiusInRadians = maxDistanceKm / 6378.1; // Convert km to radians (Earth's radius ~6378.1 km)

        // Find journeys within 5 km radius of leaveFrom
        const journeys = await Journey.find({
            leaveFrom: {
                $geoWithin: {
                    $centerSphere: [[leaveFromLng, leaveFromLat], radiusInRadians],
                },
            },
            goingTo: {
                $geoWithin: {
                    $centerSphere: [[goingToLng, goingToLat], radiusInRadians],
                },
            },
        });

        if (journeys.length === 0) {
            return res.status(404).json({ message: "No nearby journeys found" });
        }
        const updatedJourneys = await getJourneyNameByGeos(journeys)

        res.status(200).json(updatedJourneys);
    } catch (error) {
        console.error("Error searching journeys:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Haversine formula to calculate distance between two geo-coordinates
const haversineDistance = (coord1, coord2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.lat - coord1.lat) * (Math.PI / 180);
    const dLng = (coord2.lng - coord1.lng) * (Math.PI / 180);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(coord1.lat * (Math.PI / 180)) * Math.cos(coord2.lat * (Math.PI / 180)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};


module.exports = {
    registerUser,
    loginUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    createJourney,
    getAllJourney,
    getJourneyByID,
    searchCities,
};
