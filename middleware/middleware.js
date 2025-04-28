const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    console.log("Received Token:", token);  // Log the token to check if it's being passed correctly
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log("Decoded User:", req.user);  // Log the decoded user to check if it's being set
        next();
    } catch (error) {
        console.error("Error verifying token:", error);  // Log the error if any
        res.status(401).json({ message: "Invalid token" });
    }
};


module.exports = protect;
