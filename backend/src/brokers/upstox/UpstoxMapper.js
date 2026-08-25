/**
 * Convert an Upstox order status into
 * Trade Guard's common status.
 *
 * Upstox uses lowercase status values such as
 * "complete", while our database uses uppercase
 * values such as "COMPLETE".
 */
function mapOrderStatus(status) {

    if (!status) {
        return undefined;
    }

    const normalizedStatus = status.toLowerCase();

    const statusMap = {

        "complete": "COMPLETE",

        "cancelled": "CANCELLED",

        "rejected": "REJECTED",

        "pending": "PENDING",

        "open": "PENDING",

        "trigger pending": "PENDING",

        "put order req received": "TRANSIT",

        "modify pending": "TRANSIT",

        "cancel pending": "TRANSIT"
    };

    return statusMap[normalizedStatus] || "PENDING";
}


/**
 * Convert Upstox order type into
 * Trade Guard's order type.
 *
 * Upstox already uses:
 *
 * MARKET
 * LIMIT
 * SL
 * SL-M
 *
 * which matches our TradeRecord enum.
 */
function mapOrderType(orderType) {

    if (!orderType) {
        return undefined;
    }

    const normalizedType = orderType.toUpperCase();

    const validTypes = [
        "MARKET",
        "LIMIT",
        "SL",
        "SL-M"
    ];

    if (validTypes.includes(normalizedType)) {
        return normalizedType;
    }

    return undefined;
}


/**
 * Convert an Upstox order response
 * into Trade Guard's common order representation.
 *
 * IMPORTANT:
 * This is an ORDER representation.
 *
 * It should not automatically be treated as an
 * executed TradeRecord because an order can be:
 *
 * PENDING
 * CANCELLED
 * REJECTED
 * partially filled
 * etc.
 */
function mapUpstoxOrder(order) {

    if (!order) {
        throw new Error("Upstox order data is required");
    }

    return {

        // Broker identifiers
        orderId: order.order_id,

        exchangeOrderId:
            order.exchange_order_id || null,

        orderRefId:
            order.order_ref_id || null,


        // Instrument information
        symbol:
            order.trading_symbol ||
            order.tradingsymbol ||
            null,

        instrumentToken:
            order.instrument_token || null,

        exchange:
            order.exchange || null,


        // Order information
        transactionType:
            order.transaction_type || null,

        quantity:
            Number(order.quantity || 0),

        filledQuantity:
            Number(order.filled_quantity || 0),

        pendingQuantity:
            Number(order.pending_quantity || 0),

        price:
            Number(order.price || 0),

        averagePrice:
            Number(order.average_price || 0),

        triggerPrice:
            Number(order.trigger_price || 0),

        orderType:
            mapOrderType(order.order_type),

        productType:
            order.product || null,


        // Status
        status:
            mapOrderStatus(order.status),

        statusMessage:
            order.status_message || null,

        statusMessageRaw:
            order.status_message_raw || null,


        // Time information
        orderTime:
            order.order_timestamp
                ? new Date(order.order_timestamp)
                : null,

        exchangeTime:
            order.exchange_timestamp
                ? new Date(order.exchange_timestamp)
                : null,


        // Other Upstox information
        validity:
            order.validity || null,

        variety:
            order.variety || null,

        isAmo:
            Boolean(order.is_amo)
    };
}


/**
 * Convert an Upstox trade into our common
 * TradeRecord representation.
 *
 * This is used by getTradesForDay()
 * during synchronization.
 */
function mapUpstoxTrade(trade) {

    if (!trade) {
        throw new Error("Upstox trade data is required");
    }

    return {

        // Upstox trade ID
        tradeId:
            trade.trade_id || null,

        // Upstox order reference
        orderId:
            trade.order_ref_id || null,

        // Instrument
        symbol:
            trade.trading_symbol || null,

        exchange:
            trade.exchange || null,

        // BUY / SELL
        transactionType:
            trade.transaction_type || null,

        // Actual executed quantity
        quantity:
            Number(
                trade.traded_quantity ||
                trade.quantity ||
                0
            ),

        // Actual execution price
        executedPrice:
            Number(
                trade.traded_price ||
                trade.average_price ||
                0
            ),

        // Product
        productType:
            trade.product || null,

        // Upstox trade endpoint gives execution information,
        // so synchronized trades are treated as completed.
        status: "COMPLETE",

        // Keep the original broker data.
        // This is extremely useful for debugging/auditing.
        brokerResponse: trade
    };
}


module.exports = {
    mapOrderStatus,
    mapOrderType,
    mapUpstoxOrder,
    mapUpstoxTrade
};