const mapUpstoxTrade = (trade) => {
    if (!trade) {
        throw new Error("Upstox trade data is required");
    }

    if (!trade.trade_id) {
        throw new Error("Upstox trade does not contain trade ID");
    }

    return {
        tradeId: String(trade.trade_id),

        orderId: trade.order_id
            ? String(trade.order_id)
            : null,

        broker: "UPSTOX",

        symbol:
            trade.symbol ||
            trade.scrip_name ||
            trade.trading_symbol ||
            null,

        transactionType: trade.transaction_type,

        quantity: Number(trade.quantity || 0),

        executedPrice: Number(
            trade.price ??
            trade.average_price ??
            0
        ),

        status: "COMPLETE",

        brokerResponse: trade
    };
};

const mapUpstoxOrder = (order) => {

    if (!order) {
        throw new Error(
            "Upstox order data is required"
        );
    }

    return {

        broker: "UPSTOX",

        orderId:
            order.order_id || null,

        symbol:
            order.trading_symbol || null,

        transactionType:
            order.transaction_type || null,

        quantity:
            Number(order.quantity || 0),

        executedPrice:
            Number(
                order.average_price ||
                order.price ||
                0
            ),

        orderType:
            order.order_type || undefined,

        status:
            mapUpstoxOrderStatus(
                order.status
            ),

        brokerResponse: order
    };
};

const mapUpstoxOrderStatus = (status) => {

    if (!status) {
        return undefined;
    }


    const statusMap = {

        complete: "COMPLETE",

        completed: "COMPLETE",

        cancelled: "CANCELLED",

        rejected: "REJECTED",

        pending: "PENDING",

        open: "PENDING",

        "trigger pending": "PENDING",

        "modify pending": "TRANSIT",

        "cancel pending": "TRANSIT"
    };


    return (
        statusMap[
            status.toLowerCase()
        ] || "PENDING"
    );
};


export {
    mapUpstoxTrade,
    mapUpstoxOrder,
    mapUpstoxOrderStatus
};