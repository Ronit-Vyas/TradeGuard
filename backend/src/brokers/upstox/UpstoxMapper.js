// ======================================================
// MAP TRADE
// Works for both:
// 1. Historical Trades API
// 2. Get Trades For Day API
// ======================================================

const mapUpstoxTrade = (trade) => {

    if (!trade) {
        throw new Error(
            "Upstox trade data is required"
        );
    }

    if (!trade.trade_id) {
        throw new Error(
            "Upstox trade does not contain trade ID"
        );
    }


    return {

        // Unique execution/trade ID
        tradeId:
            String(trade.trade_id),


        // Historical API does not provide order_id.
        // Today's Trades API does.
        orderId:
            trade.order_id
                ? String(trade.order_id)
                : null,


        broker:
            "UPSTOX",


        // Historical API:
        // symbol / scrip_name
        //
        // Today's API:
        // trading_symbol
        symbol:
            trade.trading_symbol ||
            trade.symbol ||
            trade.scrip_name ||
            null,


        transactionType:
            trade.transaction_type || null,


        quantity:
            Number(trade.quantity || 0),


        // Historical API:
        // price
        //
        // Today's API:
        // average_price
        price:
            Number(
                trade.average_price ??
                trade.price ??
                0
            ),


        status:
            "COMPLETE",


        // Historical trade API doesn't provide
        // order type.
        //
        // Today's trade API may provide it.
        orderType:
            trade.order_type || undefined,


        brokerResponse:
            trade
    };
};


// ======================================================
// MAP ORDER
// Used by Portfolio WebSocket
// ======================================================

const mapUpstoxOrder = (order) => {

    if (!order) {
        throw new Error(
            "Upstox order data is required"
        );
    }


    return {

        broker:
            "UPSTOX",


        orderId:
            order.order_id
                ? String(order.order_id)
                : null,


        symbol:
            order.trading_symbol ||
            order.symbol ||
            null,


        transactionType:
            order.transaction_type ||
            null,


        quantity:
            Number(order.quantity || 0),


        price:
            Number(
                order.average_price ??
                order.price ??
                0
            ),


        averagePrice:
            Number(
                order.average_price ??
                order.price ??
                0
            ),


        orderType:
            order.order_type ||
            undefined,


        status:
            mapUpstoxOrderStatus(
                order.status
            ),


        brokerResponse:
            order
    };
};


// ======================================================
// MAP ORDER STATUS
// ======================================================

const mapUpstoxOrderStatus = (status) => {

    if (!status) {
        return undefined;
    }


    const statusMap = {

        complete:
            "COMPLETE",

        completed:
            "COMPLETE",

        cancelled:
            "CANCELLED",

        rejected:
            "REJECTED",

        pending:
            "PENDING",

        open:
            "PENDING",

        "trigger pending":
            "PENDING",

        "modify pending":
            "TRANSIT",

        "cancel pending":
            "TRANSIT"
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