import userRoutes from './routes/userRoutes.js';
import brokerAccountRoutes from './routes/brokerAccountRoutes.js'
import express from 'express';
import {connectDB} from './config/db.js';
import cors from 'cors';
import dotenv from "dotenv";


dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true 
};

app.use(cors(corsOptions));

app.use(express.json())

app.use("/api/users" , userRoutes);
app.use("/api/broker-accounts", brokerAccountRoutes);

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`TradeGuard server running on port ${PORT}`);
    });
};

startServer();
