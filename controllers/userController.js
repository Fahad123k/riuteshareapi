const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");




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

module.exports = {
    registerUser,
    loginUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
};
