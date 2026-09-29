const mapUpstoxSegment = (segment) => {
    if (!segment) return undefined;

    const segmentMap = {
        "EQ": "EQUITY",
        "F&O": "FUTURES",
        "FO": "FUTURES",
        "OP": "OPTIONS",
        "CUR": "CURRENCY",
        "CD": "COMMODITY"
    };

    const normalized = String(segment).toUpperCase();
    return segmentMap[normalized] || undefined;
};

const mapUpstoxProduct = (product) => {
    if (!product) return undefined;

    const productMap = {
        "I": "INTRADAY",
        "D": "DELIVERY",
        "CO": "COVER_ORDER",
        "MTF": "MTF"
    };

    const normalized = String(product).toUpperCase();
    return productMap[normalized] || undefined;
};

/**
 * Normalize order type values to the values supported by TradeGuard.
 */
const mapUpstoxOrderType = (orderType) => {
    if (!orderType) return undefined;

    const normalized = String(orderType).toUpperCase();

    const validOrderTypes = [
        "MARKET",
        "LIMIT",
        "SL",
        "SL-M"
    ];

    return validOrderTypes.includes(normalized)
        ? normalized
        : undefined;
};

/**
 * Determine the instrument segment.
 *
 * Prefer explicit instrument type because a generic FO segment
 * alone cannot distinguish futures from options.
 */
const mapUpstoxInstrumentSegment = (trade) => {
    const instrumentType = String(
        trade.instrument_type ||
        trade.instrumentType ||
        trade.instrument_type_name ||
        ""
    ).toUpperCase();

    if (
        ["CE", "PE", "OPTIDX", "OPTSTK", "OPTIONS", "OPTION"]
            .includes(instrumentType)
    ) {
        return "OPTIONS";
    }

    if (
        ["FUT", "FUTIDX", "FUTSTK", "FUTURES", "FUTURE"]
            .includes(instrumentType)
    ) {
        return "FUTURES";
    }

    const mappedSegment = mapUpstoxSegment(trade.segment);

    // If the segment is generic F&O, inspect the trading symbol
    // for an option suffix such as CE or PE.
    const symbol = String(
        trade.trading_symbol ||
        trade.symbol ||
        trade.scrip_name ||
        ""
    ).toUpperCase();

    if (
        mappedSegment === "FUTURES" &&
        /\b(CE|PE)\b/.test(symbol)
    ) {
        return "OPTIONS";
    }

    return mappedSegment;
};

const mapUpstoxTrade = (trade) => {
    if (!trade) {
        throw new Error("Upstox trade data is required");
    }

    if (!trade.trade_id) {
        throw new Error("Upstox trade does not contain trade ID");
    }

    return {
        tradeId: String(trade.trade_id),

        orderId:
            trade.order_id !== undefined && trade.order_id !== null
                ? String(trade.order_id)
                : null,

        broker: "UPSTOX",

        symbol:
            trade.trading_symbol ||
            trade.symbol ||
            trade.scrip_name ||
            null,

        transactionType: trade.transaction_type
            ? String(trade.transaction_type).toUpperCase()
            : undefined,

        quantity: Number(trade.quantity || 0),

        executedPrice: Number(
            trade.price ??
            trade.average_price ??
            0
        ),

        status: "COMPLETE",

        orderType: mapUpstoxOrderType(
            trade.order_type || trade.orderType
        ),

        segment: mapUpstoxInstrumentSegment(trade),

        productCode: mapUpstoxProduct(trade.product),

        tradeTime: trade.trade_date
            ? new Date(trade.trade_date)
            : trade.exchange_timestamp
            ? new Date(trade.exchange_timestamp)
            : trade.timestamp
            ? new Date(trade.timestamp)
            : null,

        brokerResponse: trade
    };
};

const mapUpstoxOrder = (order) => {
    if (!order) {
        throw new Error("Upstox order data is required");
    }

    return {
        broker: "UPSTOX",

        orderId:
            order.order_id !== undefined && order.order_id !== null
                ? String(order.order_id)
                : null,

        symbol:
            order.trading_symbol ||
            order.symbol ||
            null,

        transactionType: order.transaction_type
            ? String(order.transaction_type).toUpperCase()
            : undefined,

        quantity: Number(order.quantity || 0),

        executedPrice: Number(
            order.average_price ??
            order.price ??
            0
        ),

        orderType: mapUpstoxOrderType(
            order.order_type || order.orderType
        ),

        status: mapUpstoxOrderStatus(order.status),

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

    const normalized = String(status).toLowerCase();

    return statusMap[normalized] || "PENDING";
};

export {
    mapUpstoxTrade,
    mapUpstoxOrder,
    mapUpstoxOrderStatus,
    mapUpstoxSegment,
    mapUpstoxProduct,
    mapUpstoxOrderType,
    mapUpstoxInstrumentSegment
};