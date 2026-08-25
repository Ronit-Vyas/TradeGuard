import mongoose from "mongoose";

const tradeRecordSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        brokerAccountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BrokerAccount",
            required: true,
            index: true
        },

        // Broker's identifier for the order
        orderId: {
            type: String,
            required: true
        },

        // Broker's identifier for the actual trade/fill
        tradeId: {
            type: String
        },

        symbol: {
            type: String,
            required: true
        },

        exchange: {
            type: String
        },

        segment: {
            type: String,
            enum: [
                "EQUITY",
                "FUTURES",
                "OPTIONS"
            ]
        },

        transactionType: {
            type: String,
            enum: ["BUY", "SELL"],
            required: true
        },

        quantity: {
            type: Number,
            required: true
        },

        executedPrice: {
            type: Number,
            required: true
        },

        orderType: {
            type: String,
            enum: [
                "MARKET",
                "LIMIT",
                "SL",
                "SL-M"
            ]
        },

        productType: {
            type: String
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "TRANSIT",
                "COMPLETE",
                "CANCELLED",
                "REJECTED",
                "FAILED"
            ]
        },

        tradeTime: {
            type: Date
        },

        // Original broker response
        brokerResponse: {
            type: mongoose.Schema.Types.Mixed
        }
    },
    {
        timestamps: true
    }
);

const TradeRecord = mongoose.model(
    "TradeRecord",
    tradeRecordSchema
);

export default TradeRecord;