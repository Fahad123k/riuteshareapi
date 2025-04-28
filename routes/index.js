const express = require('express');
const router = express.Router();

const userRouter = require('./user');

// Default route
router.get("/", (req, res) => {
    res.send("Hello, I am the main router");
});

// Use the user router for `/user` routes
router.use('/user', userRouter);
router.use('/booking', require('./booking'))

module.exports = router;
