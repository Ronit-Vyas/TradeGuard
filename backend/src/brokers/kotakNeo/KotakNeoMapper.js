// Kotak Neo Mapper for TradeGuard

const mapKotakNeoSegment = (exSeg, item = {}) => {
    const rawSeg = String(exSeg || item.segment || "").toLowerCase();
    const instType = String(item.it || item.series || "").toUpperCase();
    const optType = String(item.optTp || "").trim();
    const sym = String(item.trdSym || item.sym || "").toUpperCase();

    if (rawSeg.includes("cm") || rawSeg === "nse" || rawSeg === "bse" || instType === "EQ") {
        return "EQUITY";
    }

    if (rawSeg.includes("fo") || rawSeg.includes("nfo") || rawSeg.includes("bfo") || rawSeg.includes("mcx")) {
        if (optType === "CE" || optType === "PE" || instType === "OPT" || /\b(CE|PE)\b/.test(sym)) {
            return "OPTIONS";
        }
        return "FUTURES";
    }

    if (/\b(CE|PE)\b/.test(sym)) {
        return "OPTIONS";
    }

    return "EQUITY";
};

const mapKotakNeoProduct = (product) => {
    if (!product) return "NRML";
    const p = String(product).toUpperCase();
    if (p === "CNC" || p === "CASH AND CARRY") return "CNC";
    if (p === "MIS" || p === "INTRADAY") return "INTRADAY";
    if (p === "NRML" || p === "NORMAL") return "NRML";
    if (p === "CO") return "CO";
    if (p === "BO") return "BO";
    if (p === "MTF") return "MTF";
    return p;
};

const mapKotakNeoOrderType = (prcTp) => {
    if (!prcTp) return "MARKET";
    const tp = String(prcTp).toUpperCase();
    if (tp === "L" || tp === "LIMIT") return "LIMIT";
    if (tp === "MKT" || tp === "MARKET") return "MARKET";
    if (tp === "SL") return "SL";
    if (tp === "SL-M" || tp === "SLM") return "SL-M";
    return "MARKET";
};

const parseKotakNeoDate = (trade) => {
    if (trade.hsUpTm) {
        // format: "2025/01/22 14:28:16"
        const d = new Date(trade.hsUpTm.replace(/\//g, "-"));
        if (!isNaN(d.getTime())) return d;
    }
    if (trade.exTm) {
        // format: "22-Jan-2025 14:28:01"
        const d = new Date(trade.exTm);
        if (!isNaN(d.getTime())) return d;
    }
    if (trade.flDt) {
        const timeStr = trade.flTm || "00:00:00";
        const d = new Date(`${trade.flDt} ${timeStr}`);
        if (!isNaN(d.getTime())) return d;
    }
    if (trade.trade_date) {
        const d = new Date(trade.trade_date);
        if (!isNaN(d.getTime())) return d;
    }
    if (trade.timestamp) {
        const d = new Date(trade.timestamp);
        if (!isNaN(d.getTime())) return d;
    }
    return new Date();
};

const mapKotakNeoTrade = (trade) => {
    if (!trade) {
        throw new Error("Kotak Neo trade data is required");
    }

    const tradeId = String(
        trade.flId ||
        trade.trade_id ||
        (trade.nOrdNo ? `${trade.nOrdNo}-${trade.flLeg || 1}` : null) ||
        trade.exOrdId ||
        Date.now()
    );

    const rawTrns = String(trade.trnsTp || trade.transaction_type || "").toUpperCase();
    const transactionType = (rawTrns === "B" || rawTrns.startsWith("BUY")) ? "BUY" : "SELL";

    const executedPrice = Number(
        trade.avgPrc ?? trade.price ?? trade.prc ?? trade.average_price ?? 0
    );

    const quantity = Number(
        trade.fldQty ?? trade.qty ?? trade.quantity ?? 0
    );

    return {
        tradeId,
        orderId: trade.nOrdNo ? String(trade.nOrdNo) : (trade.exOrdId ? String(trade.exOrdId) : (trade.order_id ? String(trade.order_id) : `ORD-${tradeId}`)),
        broker: "KOTAK_NEO",
        symbol: trade.trdSym || trade.sym || trade.trading_symbol || "UNKNOWN",
        exchange: String(trade.exSeg || "NSE").toUpperCase().split("_")[0],
        transactionType,
        quantity,
        executedPrice,
        status: "COMPLETE",
        orderType: mapKotakNeoOrderType(trade.prcTp || trade.order_type),
        segment: mapKotakNeoSegment(trade.exSeg, trade),
        productCode: mapKotakNeoProduct(trade.prod || trade.product),
        tradeTime: parseKotakNeoDate(trade),
        brokerResponse: trade
    };
};

export {
    mapKotakNeoSegment,
    mapKotakNeoProduct,
    mapKotakNeoOrderType,
    mapKotakNeoTrade
};
