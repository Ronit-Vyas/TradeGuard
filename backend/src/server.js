import userRoutes from './routes/userRoutes.js';
import brokerAccountRoutes from './routes/brokerAccountRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';

import express from 'express';
import { connectDB } from './config/db.js';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';

import liveWebSocketService from './services/Websocket/LiveWebSocketSevice.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

// --------------------
// CORS
// --------------------

const corsOptions = {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
};

app.use(cors(corsOptions));

app.use(express.json());

// --------------------
// Routes
// --------------------

app.use("/api/users", userRoutes);
app.use("/api/broker-accounts", brokerAccountRoutes);
app.use("/api/trades", tradeRoutes);

// --------------------
// Create HTTP Server
// --------------------

const server = http.createServer(app);

// --------------------
// Initialize WebSocket
// --------------------

liveWebSocketService.initialize(server);

// --------------------
// Start Server
// --------------------

const startServer = async () => {
    try {

        await connectDB();

        server.listen(PORT, () => {
            console.log(
                `TradeGuard server running on port ${PORT}`
            );

            console.log(
                `Live WebSocket running on ws://localhost:${PORT}/ws/live`
            );
        });

    } catch (error) {

        console.error(
            "Failed to start TradeGuard server:",
            error
        );

        process.exit(1);
    }
};

startServer();