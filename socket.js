// socket.js (or wherever your socket setup is)
module.exports = (server) => {
    const { Server } = require('socket.io');
    const Message = require('./models/message');

    const io = new Server(server, {
        cors: {
            origin: ["http://localhost:5173", "https://route-share-front.vercel.app"],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        },
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000,
            skipMiddlewares: true,
        }
    });

    const userSocketMap = new Map();

    io.on('connection', (socket) => {
        console.log(`New connection: ${socket.id}`);

        // Register user with their socket
        socket.on('register-user', (userId) => {
            userSocketMap.set(userId, socket.id);
            socket.join(userId);
            console.log(`User ${userId} registered with socket ${socket.id}`);
        });

        // Handle sending messages
        socket.on('send-message', async ({ senderId, receiverId, text }, callback) => {
            try {
                // Save to database
                const newMessage = new Message({
                    senderId,
                    receiverId,
                    text
                });

                const savedMessage = await newMessage.save();
                const populatedMessage = await Message.populate(savedMessage, [
                    { path: 'senderId', select: 'name email' },
                    { path: 'receiverId', select: 'name email' }
                ]);

                // Send to receiver
                const receiverSocketId = userSocketMap.get(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('receive-message', populatedMessage);
                }

                // Send success to sender
                callback({ success: true, message: populatedMessage });
            } catch (error) {
                console.error('Error sending message:', error);
                callback({ success: false, error: 'Failed to send message' });
            }
        });

        // Handle typing indicators
        socket.on('typing', ({ receiverId, senderId }) => {
            const receiverSocketId = userSocketMap.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('user-typing', { senderId });
            }
        });

        // Clean up on disconnect
        socket.on('disconnect', () => {
            console.log(`Disconnected: ${socket.id}`);
            for (let [userId, id] of userSocketMap.entries()) {
                if (id === socket.id) {
                    userSocketMap.delete(userId);
                    break;
                }
            }
        });
    });

    return io;
};