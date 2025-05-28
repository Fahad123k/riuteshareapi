const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Journey = require("../models/Journey")
const axios = require("axios");
const mongoose = require('mongoose');

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
const getJourneyNameByGeos = async (journeyData, res = null) => {
    try {
        // If input is an array, process all; if single object, wrap in array
        const journeys = Array.isArray(journeyData) ? journeyData : [journeyData];
        const updatedJourneys = [];

        for (let i = 0; i < journeys.length; i++) {
            const journey = journeys[i];
            await delay(i * 500); // Avoid API rate limits

            // 1. Get user details (if userId exists)
            let username = "Unknown User";
            if (journey.userId && journey.userId.name) {
                username = journey.userId.name; // Directly use if already populated
            } else if (journey.userId) { // If just an ObjectId, fetch user
                const user = await User.findById(journey.userId);
                if (!user) {
                    if (res) return res.status(404).json({ message: "User not found" });
                    throw new Error("User not found");
                }
                username = user.name;
            }

            // 2. Extract coordinates (handle missing data)
            const leaveFromCoords = journey.leaveFrom?.coordinates || [0, 0];
            const goingToCoords = journey.goingTo?.coordinates || [0, 0];

            // 3. Fetch location names (with fallback)
            let leaveFrom = "Unknown Location";
            let goingTo = "Unknown Location";
            try {
                leaveFrom = await getLocation(leaveFromCoords[1], leaveFromCoords[0]);
                goingTo = await getLocation(goingToCoords[1], goingToCoords[0]);
            } catch (err) {
                console.error("Geocoding failed:", err);
            }

            // 4. Merge all data (preserve original + add new fields)
            updatedJourneys.push({
                ...journey._doc || journey, // Keep all original fields
                username, // Added field
                leaveFrom, // Added field
                goingTo, // Added field
                // rawCoordinates: { // Optional: Include raw coords
                //     leaveFrom: { lat: leaveFromCoords[1], lng: leaveFromCoords[0] },
                //     goingTo: { lat: goingToCoords[1], lng: goingToCoords[0] },
                // },
            });
        }

        // Return same format as input (single object or array)
        return Array.isArray(journeyData) ? updatedJourneys : updatedJourneys[0];
    } catch (error) {
        console.error("Error in getJourneyNameByGeos:", error);
        if (res) return res.status(500).json({ message: "Internal server error" });
        throw error;
    }
};
const getAllJourney = async (req, res) => {
    try {
        const allJourneys = await Journey.find().sort({ createdAt: -1 });


        // console.log(all)

        if (!allJourneys || allJourneys.length === 0) {
            return res.status(404).json({ success: false, message: "No journeys found" });
        }

        const updatedJourneys = await getJourneyNameByGeos(allJourneys)
        console.log("alll journey:", updatedJourneys)
        res.status(200).json(updatedJourneys);
    } catch (error) {
        console.error("Error fetching journeys:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


const getJourneyByID = async (req, res) => {
    try {
        const id = req.params.id || req.query.id;

        if (!id) {
            return res.status(400).json({ error: "ID is required" });
        }

        const journey = await Journey.findById(id)
            .populate("userId", "-password -role -__v") // exclude password, role, and __v
            .lean()
            .exec();


        const updatedJourney = await getJourneyNameByGeos(journey)

        // console.log("updated journer: ", updatedJourney)
        if (!journey) {
            return res.status(404).json({ error: "Journey not found" });
        }

        res.json(updatedJourney);
    } catch (err) {
        res.status(500).json({ error: "Invalid ID format" });
    }
};


const registerUser = async (req, res) => {
    try {
        const { name, email, number, password } = req.body;


        console.log("body is :-", req.body)


        // Validate input
        if (!name || !email || !password || !number) {
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
            number,
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

        // console.log("🔑 Hashed password from DB:", user.password);
        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid email or password" });
        }
        delete user.password;

        // Generate JWT Token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role }, // Payload
            process.env.JWT_SECRET, // Secret key
            { expiresIn: process.env.JWT_EXPIRES_IN || "12h" } // Expiration time
        );

        // Remove sensitive data from the user object
        // const userResponse = {
        //     id: user._id,
        //     name: user.name,
        //     email: user.email,
        //     number: user.number,
        //     isVerified: user.isVerified,
        //     rating: user.rating,
        // };

        // console.log("Response", userResponse)

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user,
        });

    } catch (error) {
        console.error("❌ Error during login:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        // console.log("All user data:", users);

        return res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users:", error.message);
        return res.status(500).json({ error: "Server Error" });
    }
};



const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// In your routes file
// router.get("/users/:id", protect, async (req, res) => {
//     try {
//         const user = await User.findById(req.params.id).select("-password");
//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }
//         res.json(user);
//     } catch (error) {
//         res.status(500).json({ message: "Server error" });
//     }
// });


const updateUser = async (req, res) => {
    try {
        const updates = req.body; // name, email, number, vehicle, etc.

        // Optional: Validate fields before update here

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });

        if (!user) return res.status(404).json({ message: "User not found" });


        // console.log("adter update", user)
        res.json({
            message: "Profile updated successfully",
            user: {
                name: user.name,
                email: user.email,
                number: user.number,
                rating: user.rating,
                idVerified: user.idVerified,

            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};

const updateUserByAdmin = async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        const { rating } = req.body;

        // Validate rating (1-5)
        if (rating === undefined || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Invalid rating value" });
        }
        // 1. Validate the user ID format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        // 2. List of allowed fields to update (security best practice)
        const allowedUpdates = ['name', 'email', 'number', 'rating', 'isVerified', 'role'];
        const isValidOperation = Object.keys(updates).every(update =>
            allowedUpdates.includes(update)
        );

        if (!isValidOperation) {
            return res.status(400).json({ message: 'Invalid updates attempted' });
        }

        // 3. Find and update the user
        const user = await User.findByIdAndUpdate(
            userId,
            { rating },
            updates,
            {
                new: true,
                runValidators: true
            }
        ).select('-password -__v'); // Exclude sensitive/uneeded fields

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 4. Log the changes for audit purposes
        console.log(`User ${userId} updated with:`, updates);
        console.log('Updated user:', user);

        res.json({
            success: true,
            message: 'User updated successfully',
            user
        });

    } catch (error) {
        console.error('Update Error:', error);

        // Handle specific Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: messages
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error during update',
            error: error.message
        });
    }
};

const updateUserRating = async (req, res) => {
    try {
        const { userId } = req.params;
        // const updates = req.body;

        const { rating } = req.body;

        // Validate rating (1-5)
        if (rating === undefined || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Invalid rating value" });
        }
        // 1. Validate the user ID format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        // 2. List of allowed fields to update (security best practice)
        // const allowedUpdates = ['rating',];




        // 3. Find and update the user
        const user = await User.findByIdAndUpdate(
            userId,
            { rating },

            {
                new: true,
                runValidators: true
            }
        ).select('-password -__v'); // Exclude sensitive/uneeded fields

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 4. Log the changes for audit purposes
        console.log(`User ${userId} updated with: ${rating}`);

        res.json({
            success: true,
            message: "User's rating updated successfully",
            user
        });

    } catch (error) {
        console.error('Update Error:', error);

        // Handle specific Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: messages
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error during update',
            error: error.message
        });
    }
};


const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.userId);
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



// async function migrateUsers() {
//     try {
//         // await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

//         const users = await User.find();

//         for (const user of users) {
//             let updated = false;

//             if (!user.number) {
//                 user.number = "0000000000"; // or any default number
//                 updated = true;
//             }

//             if (user.rating === undefined) {
//                 user.rating = 0;
//                 updated = true;
//             }

//             if (user.idVerified === undefined) {
//                 user.idVerified = false;
//                 updated = true;
//             }

//             if (!user.role) {
//                 user.role = "user";
//                 updated = true;
//             }

//             if (!Array.isArray(user.vehicles)) {
//                 user.vehicles = [];
//                 updated = true;
//             }

//             if (updated) {
//                 await user.save();
//                 console.log(`User ${user.email} updated.`);
//             }
//         }

//         console.log("Migration complete.");
//         process.exit();
//     } catch (error) {
//         console.error("Migration failed:", error);
//         process.exit(1);
//     }
// }

// migrateUsers();



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
    updateUserByAdmin,
    updateUserRating,
    searchCities,
};
