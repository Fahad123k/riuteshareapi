module.exports = (server) => {
    const { Server } = require('socket.io');

    const io = new Server(server, {
        cors: {
            origin: ["http://localhost:5173", "https://route-share-front.vercel.app"],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        },
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
            skipMiddlewares: true,
        }
    });

    // Map to track userId <=> socketId
    const userSocketMap = new Map();

    io.on('connection', (socket) => {
        console.log(`New user connected: ${socket.id}`);

        // Receive userId from client after connection
        socket.on('register-user', (userId) => {
            userSocketMap.set(userId, socket.id);
            socket.join(userId); // Join room with userId (for private messaging)
            console.log(`User ${userId} registered to socket ${socket.id}`);
        });

        // Handle sending private messages
        socket.on('send-message', ({ to, text, from }) => {
            console.log(`Message from ${from} to ${to}: ${text}`);
            io.to(to).emit('receive-message', { text, from });
        });

        // Clean up on disconnect
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
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
