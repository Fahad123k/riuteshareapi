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

    // Handle socket connections
    io.on('connection', (socket) => {
        console.log(`New user connected: ${socket.id}`);

        // Example event handlers
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });

        // Add more event handlers as needed
    });

    return io;
};