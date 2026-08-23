const tradeRecordSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        brokerAccountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BrokerAccount",
            required: true
        },

        broker: {
            type: String,
            enum: ["UPSTOX", "ANGEL_ONE", "DHAN", "KOTAK_NEO"],
            required: true
        },

        orderId: {
            type: String,
            required: true
        },

        symbol: {
            type: String,
            required: true
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

        price: Number,

        averagePrice: Number,

        orderType: {
            type: String,
            enum: ["MARKET", "LIMIT", "SL", "SL-M"]
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

        // Original broker response
        brokerResponse: {
            type: mongoose.Schema.Types.Mixed
        }
    },
    {
        timestamps: true
    }
);