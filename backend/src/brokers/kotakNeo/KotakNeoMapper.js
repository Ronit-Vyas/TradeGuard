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

const mapKotakNeoPosition = (pos) => {
    if (!pos) return null;

    const buyQty = Number(pos.flBuyQty ?? pos.buyQty ?? pos.cfBuyQty ?? 0);
    const sellQty = Number(pos.flSellQty ?? pos.sellQty ?? pos.cfSellQty ?? 0);
    const netQty = Number(pos.netQty ?? pos.flQty ?? (buyQty - sellQty));

    const buyAvg = Number(pos.buyAvgPrc ?? pos.buyAvg ?? (buyQty > 0 ? (Number(pos.buyAmt || 0) / buyQty) : 0));
    const sellAvg = Number(pos.sellAvgPrc ?? pos.sellAvg ?? (sellQty > 0 ? (Number(pos.sellAmt || 0) / sellQty) : 0));
    const avgPrice = netQty > 0 ? buyAvg : (netQty < 0 ? sellAvg : (buyAvg || sellAvg));

    const ltp = Number(pos.ltp ?? pos.prc ?? pos.lastPrice ?? 0);
    const pnl = Number(pos.pnl ?? pos.urPnl ?? pos.rPnl ?? pos.totPnl ?? 0);

    const symbol = String(pos.trdSym || pos.sym || pos.trading_symbol || "").toUpperCase();
    const token = String(pos.tok || pos.token || pos.instrument_token || "");
    const exchange = String(pos.exSeg || "NSE").toUpperCase().split("_")[0];

    return {
        broker: "KOTAK_NEO",
        symbol,
        instrumentToken: token,
        exchange,
        product: mapKotakNeoProduct(pos.prod || pos.product),
        quantity: netQty,
        buyQuantity: buyQty,
        sellQuantity: sellQty,
        averagePrice: avgPrice,
        buyAveragePrice: buyAvg,
        sellAveragePrice: sellAvg,
        lastPrice: ltp,
        pnl,
        raw: pos
    };
};

const mapKotakNeoHolding = (holding) => {
    if (!holding) return null;

    return {
        broker: "KOTAK_NEO",
        symbol: String(holding.trdSym || holding.sym || holding.trading_symbol || "").toUpperCase(),
        isin: holding.isin || "",
        exchange: String(holding.exSeg || "NSE").toUpperCase().split("_")[0],
        quantity: Number(holding.hldQty || holding.qty || holding.quantity || 0),
        authorisedQuantity: Number(holding.authQty || holding.authorisedquantity || 0),
        averagePrice: Number(holding.avgPrc || holding.averageprice || 0),
        lastPrice: Number(holding.ltp || holding.lastPrice || 0),
        pnl: Number(holding.pnl || holding.profitandloss || 0),
        closePrice: Number(holding.close || holding.closePrice || 0)
    };
};

export {
    mapKotakNeoSegment,
    mapKotakNeoProduct,
    mapKotakNeoOrderType,
    mapKotakNeoTrade,
    mapKotakNeoPosition,
    mapKotakNeoHolding
};

