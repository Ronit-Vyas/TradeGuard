import mongoose from "mongoose";
import TradeRecord from "../models/TradeRecord.js";
import BrokerAccount from "../models/BrokerAccount.js";
import { calculateCharges, calculatePnL } from "../services/calculations.js";
import brokerConfig from "../services/brokers/brokerConfig.js";
import positionEngine from "../services/position/PositionEngine.js";
import pnlEngine from "../services/pnl/PnLEngine.js";

const getUserId = (req, res) => {
  const userId = req.query.userId || req.params.userId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400).json({ success: false, message: "A valid MongoDB userId is required" });
    return null;
  }
  return userId;
};

export const listTrades = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;
    const { broker, side, search, limit = "500" } = req.query;
    const filter = { userId, status: "COMPLETE" };
    if (broker && broker !== "all") filter.broker = broker;
    if (side && side !== "all") filter.transactionType = side.toUpperCase();
    if (search) filter.symbol = { $regex: String(search).slice(0, 80), $options: "i" };
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 500, 1), 2000);
    const records = await TradeRecord.find(filter)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();
    return res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    console.error("List trades error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch trades" });
  }
};

export const getTradeSummary = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;
    const [summary] = await TradeRecord.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: "COMPLETE" } },
      { $group: {
        _id: null,
        totalExecutions: { $sum: 1 },
        buyExecutions: { $sum: { $cond: [{ $eq: ["$transactionType", "BUY"] }, 1, 0] } },
        sellExecutions: { $sum: { $cond: [{ $eq: ["$transactionType", "SELL"] }, 1, 0] } },
        totalQuantity: { $sum: "$quantity" },
        brokerSet: { $addToSet: "$broker" },
        symbolSet: { $addToSet: "$symbol" }
      }}
    ]);
    const accounts = await BrokerAccount.countDocuments({ userId });
    return res.json({
      success: true,
      data: {
        totalExecutions: summary?.totalExecutions || 0,
        buyExecutions: summary?.buyExecutions || 0,
        sellExecutions: summary?.sellExecutions || 0,
        totalQuantity: summary?.totalQuantity || 0,
        brokersWithTrades: summary?.brokerSet?.length || 0,
        distinctSymbols: summary?.symbolSet?.length || 0,
        brokerAccounts: accounts
      }
    });
  } catch (error) {
    console.error("Trade summary error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to calculate trade summary" });
  }
};


function effectiveTradeDate(t) {
  const d = t.tradeTime || t.executedAt || t.createdAt || t.updatedAt;
  const parsed = d ? new Date(d) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

export function getEffectivePrice(t) {
  const p = Number(t.executedPrice ?? t.brokerResponse?.price ?? t.price);
  return Number.isFinite(p) ? p : 0;
}

// FIFO matching of executions; only closed quantity contributes realized P&L.
function buildRealizedMatches(records) {
  const queues = new Map();
  const closes = [];
  const ordered = [...records].filter(t => effectiveTradeDate(t) &&
    Number(t.quantity) > 0 && getEffectivePrice(t) > 0)
    .sort((a,b) => effectiveTradeDate(a)-effectiveTradeDate(b));
  for (const t of ordered) {
    const key = [String(t.brokerAccountId || ""), t.exchange || "", t.segment || "",
      t.symbol || "", t.productCode || ""].join("|");
    const side = String(t.transactionType || "").toUpperCase();
    if (!["BUY","SELL"].includes(side)) continue;
    const signedQty = side === "BUY" ? Number(t.quantity) : -Number(t.quantity);
    let remaining = Math.abs(signedQty);
    const queue = queues.get(key) || [];
    const execPrice = getEffectivePrice(t);
    while (remaining > 0 && queue.length && Math.sign(queue[0].qty) !== Math.sign(signedQty)) {
      const lot = queue[0];
      const matched = Math.min(remaining, Math.abs(lot.qty));
      const pnl = (execPrice - lot.price) * matched * (lot.qty > 0 ? 1 : -1);
      closes.push({ pnl, quantity: matched, broker: t.broker || "UNKNOWN",
        date: effectiveTradeDate(t), symbol: t.symbol, entryPrice: lot.price,
        exitPrice: execPrice });
      lot.qty += Math.sign(signedQty) * matched;
      remaining -= matched;
      if (Math.abs(lot.qty) < 1e-9) queue.shift();
    }
    if (remaining > 0) queue.push({ qty: Math.sign(signedQty) * remaining, price: execPrice });
    queues.set(key, queue);
  }
  return closes;
}

export const getAnalytics = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;
    const objectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();
    const range = String(req.query.range || "30d").toLowerCase();

    let cutoff;
    if (range === "today" || range === "1d") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (range === "7d" || range === "1w") {
      cutoff = new Date(now.getTime() - 7 * 86400000);
    } else if (range === "30d" || range === "1m") {
      cutoff = new Date(now.getTime() - 30 * 86400000);
    } else if (range === "90d" || range === "3m") {
      cutoff = new Date(now.getTime() - 90 * 86400000);
    } else if (range === "1y" || range === "365d") {
      cutoff = new Date(now.getTime() - 365 * 86400000);
    } else if (range === "all") {
      cutoff = new Date(0);
    } else {
      cutoff = new Date(now.getTime() - 30 * 86400000);
    }

    const all = await TradeRecord.find({ userId: objectId, status: "COMPLETE" }).lean();
    const trades = all.filter(t => {
      const d = effectiveTradeDate(t);
      return d && d >= cutoff && d <= now;
    }).sort((a,b) => effectiveTradeDate(a)-effectiveTradeDate(b));

    // Include pre-range executions so positions opened earlier can be matched to exits in range.
    const closes = buildRealizedMatches(all).filter(c => c.date >= cutoff && c.date <= now);
    const byDay = new Map();
    for (const c of closes) {
      const key = c.date.toISOString().slice(0,10);
      byDay.set(key, (byDay.get(key) || 0) + c.pnl);
    }
    let running = 0;
    const equitySeries = [...byDay.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([date,pnl]) => {
      running += pnl;
      return { date: new Date(`${date}T12:00:00`).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}), value: Math.round(running) };
    });

    // Adaptive Period breakdown (weeks / quarters / months / intraday hours)
    const weeklyPnL = [];
    const totalSpanMs = Math.max(now.getTime() - cutoff.getTime(), 86400000);
    const periodSliceMs = totalSpanMs / 4;

    for (let i = 3; i >= 0; i--) {
      const pStart = new Date(now.getTime() - (i + 1) * periodSliceMs);
      const pEnd = new Date(now.getTime() - i * periodSliceMs);
      const matched = closes.filter(c => c.date >= pStart && c.date < pEnd);

      let label = `P${4 - i}`;
      if (range === "today" || range === "1d") {
        label = i === 3 ? "Morning" : i === 2 ? "Midday" : i === 1 ? "Afternoon" : "Closing";
      } else if (range === "1y" || range === "365d" || range === "all") {
        label = `Q${4 - i}`;
      } else if (range === "90d") {
        label = `Period ${4 - i}`;
      } else {
        label = `Week ${4 - i}`;
      }

      weeklyPnL.push({
        label,
        wins: Math.round(matched.filter(c => c.pnl > 0).reduce((s, c) => s + c.pnl, 0)),
        losses: Math.round(matched.filter(c => c.pnl < 0).reduce((s, c) => s + c.pnl, 0))
      });
    }

    const brokerMap = new Map();
    for (const c of closes) brokerMap.set(c.broker,(brokerMap.get(c.broker)||0)+c.pnl);

    const brokerPnL = [...brokerMap.entries()].map(([broker,value])=>({
      broker,name:brokerConfig.brokers[broker]?.name||broker,value:Math.round(value)
    }));
    const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const activity=new Map();
    for (const t of trades) { const d=effectiveTradeDate(t); const name=dayNames[d.getDay()]; activity.set(name,(activity.get(name)||0)+1); }
    const dailyActivity=dayNames.map(day=>({day,value:activity.get(day)||0}));
    const wins=closes.filter(c=>c.pnl>0), losses=closes.filter(c=>c.pnl<0);
    return res.json({success:true,data:{
      equitySeries,weeklyPnL,brokerPnL,dailyActivity,
      averageWin:wins.length?wins.reduce((s,c)=>s+c.pnl,0)/wins.length:0,
      averageLoss:losses.length?Math.abs(losses.reduce((s,c)=>s+c.pnl,0)/losses.length):0,
      winningTrades:wins.length,losingTrades:losses.length,
      realizedPnL:closes.reduce((s,c)=>s+c.pnl,0),closedTrades:closes.length
    }});
  } catch(error) {
    console.error("Analytics error:",error.message);
    return res.status(500).json({success:false,message:"Failed to fetch analytics"});
  }
};

export const getInstrumentDistribution = async (req, res) => {
  try {
    const userId=getUserId(req,res); if(!userId)return;
    const trades=await TradeRecord.find({userId:new mongoose.Types.ObjectId(userId),status:"COMPLETE"}).lean();
    const counts={};
    for(const t of trades){
      const seg=String(t.segment||"").toUpperCase();
      const product=String(t.productCode||"").toUpperCase();
      let category;
      if(seg==="FUTURES" || seg==="FUTURE") category="Futures";
      else if(seg==="OPTIONS" || seg==="OPTION") category="Options";
      else if(seg==="EQUITY" && ["INTRADAY","I","MIS"].includes(product)) category="Equity Intraday";
      else if(seg==="EQUITY" && ["DELIVERY","D","CNC"].includes(product)) category="Equity Delivery";
      else if(seg==="EQUITY") category="Equity (product unknown)";
      else category="Other / Unknown";
      counts[category]=(counts[category]||0)+1;
    }
    const total=Object.values(counts).reduce((a,b)=>a+b,0);
    return res.json({success:true,data:{distribution:Object.entries(counts).map(([label,count])=>({label,count,value:total?Math.round(count/total*100):0})),total}});
  }catch(error){console.error("Instrument distribution error:",error.message);return res.status(500).json({success:false,message:"Failed to fetch instrument distribution"});}
};

export const getReportData = async (req,res) => {
  try {
    const userId=getUserId(req,res); if(!userId)return;
    const now=new Date(), cutoff=new Date(now.getTime()-30*86400000);
    const all=await TradeRecord.find({userId:new mongoose.Types.ObjectId(userId),status:"COMPLETE"}).lean();
    const trades=all.filter(t=>{const d=effectiveTradeDate(t);return d&&d>=cutoff&&d<=now;});
    const closes=buildRealizedMatches(all).filter(c=>c.date>=cutoff&&c.date<=now);
    const wins=closes.filter(c=>c.pnl>0), losses=closes.filter(c=>c.pnl<0);
    const pnl=closes.reduce((s,c)=>s+c.pnl,0);
    const brokers=new Map(); for(const c of closes)brokers.set(c.broker,(brokers.get(c.broker)||0)+c.pnl);
    const brokerBreakdown=[...brokers].map(([broker,value])=>({broker,name:brokerConfig.brokers[broker]?.name||broker,value:Math.round(value)}));
    return res.json({success:true,data:{netPnl:Math.round(pnl),totalTrades:trades.length,closedTrades:closes.length,
      winRate:closes.length?Math.round(wins.length/closes.length*1000)/10:0,
      winningTrades:wins.length,losingTrades:losses.length,
      averageWin:wins.length?Math.round(wins.reduce((s,c)=>s+c.pnl,0)/wins.length):0,
      averageLoss:losses.length?Math.round(Math.abs(losses.reduce((s,c)=>s+c.pnl,0)/losses.length)):0,
      brokerBreakdown}});
  }catch(error){console.error("Report error:",error.message);return res.status(500).json({success:false,message:"Failed to fetch report data"});}
};

export const getRiskExposures = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;
    const objectId = new mongoose.Types.ObjectId(userId);

    const positions = await TradeRecord.aggregate([
      { $match: { userId: objectId, status: "COMPLETE" } },
      { $group: {
        _id: "$symbol",
        totalQty: { $sum: { $cond: [{ $eq: ["$transactionType", "BUY"] }, "$quantity", { $multiply: ["$quantity", -1] }] } },
        avgPrice: { $avg: "$executedPrice" },
        lastTrade: { $max: "$createdAt" }
      }}
    ]);

    const exposures = positions
      .filter(p => p.totalQty !== 0)
      .map(p => ({
        instrument: p._id,
        quantity: Math.abs(p.totalQty),
        avgPrice: Math.round(p.avgPrice * 100) / 100,
        lastTrade: p.lastTrade
      }));

    return res.json({
      success: true,
      data: { exposures }
    });
  } catch (error) {
    console.error("Risk exposures error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch exposures" });
  }
};

export const getBrokerComparison = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;
    const objectId = new mongoose.Types.ObjectId(userId);

    const accounts = await BrokerAccount.find({ userId: objectId }).lean();
    const connectedBrokers = new Set(accounts.filter(a => a.isConnected).map(a => a.broker));

    const brokers = Object.entries(brokerConfig.brokers).map(([key, config]) => ({
      broker: key,
      name: config.name,
      delivery: config.brokerage?.equityDelivery?.type === "FLAT" && config.brokerage?.equityDelivery?.amount === 0
        ? "₹0"
        : `₹${config.brokerage?.equityDelivery?.amount || 20}/order`,
      intraday: config.brokerage?.equityIntraday?.type === "FLAT"
        ? `₹${config.brokerage?.equityIntraday?.amount || 20}/order`
        : `₹${config.brokerage?.equityIntraday?.flat || 20}/order`,
      segments: key === "UPSTOX" ? "Equity, F&O, Currency" : key === "KOTAK_NEO" ? "Equity, F&O, Currency" : "Equity, F&O, Commodity",
      connection: connectedBrokers.has(key) ? "Connected" : "Not configured"
    }));

    return res.json({
      success: true,
      data: { brokers }
    });
  } catch (error) {
    console.error("Broker comparison error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch broker comparison" });
  }
};

export const calculateTradeCharges = async (req,res) => {
  try {
    const {broker,productType,buyPrice,sellPrice,quantity,exchange="NSE"}=req.body;
    const buy=Number(buyPrice), sell=Number(sellPrice), qty=Number(quantity);
    if(!broker||!productType||!Number.isFinite(buy)||!Number.isFinite(sell)||!Number.isFinite(qty)||buy<=0||sell<=0||qty<=0)
      return res.status(400).json({success:false,message:"broker, productType, positive buyPrice, sellPrice and quantity are required"});
    const cfg=brokerConfig.brokers[broker]; if(!cfg)return res.status(400).json({success:false,message:"Invalid broker"});
    const p=String(productType).toLowerCase().replace(/[^a-z]/g,"");
    const key=p.includes("future")?"equityFutures":p.includes("option")?"equityOptions":p.includes("delivery")?"equityDelivery":"equityIntraday";
    const rate=cfg.brokerage?.[key]; if(!rate)return res.status(400).json({success:false,message:`Brokerage configuration missing for ${key}`});
    const buyTurn=buy*qty, sellTurn=sell*qty, totalTurn=buyTurn+sellTurn;
    const brokerageFor=(turn)=> {
      if(rate.type==="FLAT")return Number(rate.amount||0);
      if(rate.type==="LOWER_OF")return Math.min(Number(rate.flat||0),turn*Number(rate.percentage||0)/100);
      if(rate.type==="PERCENTAGE")return turn*Number(rate.percentage||0)/100;
      return 0;
    };
    const brokerage=brokerageFor(buyTurn)+brokerageFor(sellTurn);
    const exchangeCfg=brokerConfig.exchangeCharges?.[exchange]?.[key] || brokerConfig.exchangeCharges?.NSE?.[key];
    const sttCfg=brokerConfig.statutoryCharges.STT[key];
    const stampCfg=brokerConfig.statutoryCharges.stampDuty[key];
    if(!exchangeCfg||!sttCfg||!stampCfg)return res.status(400).json({success:false,message:`Charge configuration missing for ${key}`});
    const basisValue=(basis,side)=> {
      if(basis==="PREMIUM")return side==="buy"?buyTurn:sellTurn;
      return side==="buy"?buyTurn:sellTurn;
    };
    const exchangeCharges=(basisValue(exchangeCfg.basis,"buy")*Number(exchangeCfg.buy||0)/100)+(basisValue(exchangeCfg.basis,"sell")*Number(exchangeCfg.sell||0)/100);
    const stt=(basisValue(sttCfg.basis,"buy")*Number(sttCfg.buy||0)/100)+(basisValue(sttCfg.basis,"sell")*Number(sttCfg.sell||0)/100);
    const stampDuty=(buyTurn*Number(stampCfg.buy||0)/100)+(sellTurn*Number(stampCfg.sell||0)/100);
    const sebi=(totalTurn*0.000001); // ₹10 per crore = 0.0001% of turnover
    const gst=(brokerage+exchangeCharges+sebi)*0.18;
    const dpCharges=key==="equityDelivery"?(Number(cfg.dpCharges?.equityDelivery?.sell||cfg.dpCharges?.equityDelivery?.amount||0)):0;
    const totalCharges=brokerage+stt+exchangeCharges+sebi+stampDuty+gst+dpCharges;
    const grossPnL=(sell-buy)*qty;
    const round=n=>Math.round((n+Number.EPSILON)*100)/100;
    return res.json({success:true,data:{brokerage:round(brokerage),stt:round(stt),exchangeCharges:round(exchangeCharges),
      sebiCharges:round(sebi),stampDuty:round(stampDuty),dpCharges:round(dpCharges),gst:round(gst),
      totalCharges:round(totalCharges),grossPnL:round(grossPnL),netPnL:round(grossPnL-totalCharges),
      assumptions:{broker,productType:key,exchange,quantity:qty,brokeragePlan:cfg.brokeragePlan||"configured rates",note:"Estimate from local brokerConfig; verify current broker/exchange rates before relying on it."}}});
  }catch(error){console.error("Calculate charges error:",error.message);return res.status(500).json({success:false,message:error.message||"Failed to calculate charges"});}
};

export const getLiveTradingSummary = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    let trades = await TradeRecord.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: "COMPLETE"
    }).lean();

    if (!trades || trades.length === 0) {
      trades = await TradeRecord.find({}).limit(50).lean();
    }

    const allPositions = positionEngine.processTrades(trades);
    const openPositions = positionEngine.getOpenPositions(trades);
    const squaredPositions = positionEngine.getFullySquaredPositions(trades);

    pnlEngine.setPositions(userId, openPositions);
    const calculated = pnlEngine.calculate(userId);

    return res.json({
      success: true,
      data: {
        ...calculated,
        allPositions,
        squaredPositions
      }
    });
  } catch (error) {
    console.error("Live trading summary error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch live trading summary" });
  }
};

export const getChargesAnalytics = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;
    const objectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();
    const range = String(req.query.range || "30d").toLowerCase();

    let cutoff;
    if (range === "today" || range === "1d") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (range === "7d" || range === "1w") {
      cutoff = new Date(now.getTime() - 7 * 86400000);
    } else if (range === "30d" || range === "1m") {
      cutoff = new Date(now.getTime() - 30 * 86400000);
    } else if (range === "90d" || range === "3m") {
      cutoff = new Date(now.getTime() - 90 * 86400000);
    } else if (range === "1y" || range === "365d") {
      cutoff = new Date(now.getTime() - 365 * 86400000);
    } else if (range === "all") {
      cutoff = new Date(0);
    } else {
      cutoff = new Date(now.getTime() - 30 * 86400000);
    }

    let allTrades = await TradeRecord.find({ userId: objectId, status: "COMPLETE" }).lean();
    if (!allTrades || allTrades.length === 0) {
      allTrades = await TradeRecord.find({ userId: objectId }).lean();
    }

    const tradesInRange = allTrades.filter(t => {
      const d = effectiveTradeDate(t);
      return d && d >= cutoff && d <= now;
    }).sort((a, b) => effectiveTradeDate(b) - effectiveTradeDate(a));

    let totalTurnover = 0;
    let totalBrokerage = 0;
    let totalSTT = 0;
    let totalGST = 0;
    let totalExchange = 0;
    let totalCTT = 0;
    let totalSEBI = 0;
    let totalStampDuty = 0;
    let totalDP = 0;
    let totalCharges = 0;

    const symbolCharges = new Map();
    const dailyCharges = new Map();

    const tradesWithCharges = tradesInRange.map(t => {
      const execPrice = getEffectivePrice(t);
      const qty = Number(t.quantity) || 0;
      const charges = pnlEngine.calculateTradeFillCharges({
        symbol: t.symbol,
        exchange: t.exchange || "NSE",
        segment: t.segment || "EQUITY",
        productType: t.productCode || "INTRADAY",
        transactionType: t.transactionType || "BUY",
        quantity: qty,
        price: execPrice,
        broker: t.broker || "UPSTOX"
      });

      totalTurnover += charges.turnover;
      totalBrokerage += charges.brokerage;
      totalSTT += charges.stt;
      totalGST += charges.gst;
      totalExchange += charges.exchangeCharges;
      totalCTT += charges.ctt;
      totalSEBI += charges.sebiCharges;
      totalStampDuty += charges.stampDuty;
      totalDP += charges.dpCharges;
      totalCharges += charges.total;

      const sym = t.symbol || "OTHER";
      symbolCharges.set(sym, (symbolCharges.get(sym) || 0) + charges.total);

      const d = effectiveTradeDate(t);
      if (d) {
        const dayKey = d.toISOString().slice(0, 10);
        dailyCharges.set(dayKey, (dailyCharges.get(dayKey) || 0) + charges.total);
      }

      return {
        _id: t._id,
        tradeId: t.tradeId,
        orderId: t.orderId,
        symbol: t.symbol,
        transactionType: t.transactionType,
        quantity: qty,
        price: execPrice,
        turnover: charges.turnover,
        tradeTime: d,
        segment: t.segment,
        exchange: t.exchange,
        broker: t.broker,
        charges
      };
    });

    const closes = buildRealizedMatches(allTrades).filter(c => c.date >= cutoff && c.date <= now);
    const grossPnL = closes.reduce((sum, c) => sum + c.pnl, 0);
    const netPnL = grossPnL - totalCharges;

    const timeline = [...dailyCharges.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        date: new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        charges: Math.round(amount * 100) / 100
      }));

    const topSymbols = [...symbolCharges.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([symbol, charges]) => ({
        symbol,
        charges: Math.round(charges * 100) / 100,
        percentage: totalCharges > 0 ? Math.round((charges / totalCharges) * 1000) / 10 : 0
      }));

    const round = n => Math.round((n + Number.EPSILON) * 100) / 100;

    return res.json({
      success: true,
      data: {
        range,
        totalTrades: tradesInRange.length,
        totalTurnover: round(totalTurnover),
        grossPnL: round(grossPnL),
        netPnL: round(netPnL),
        totalCharges: round(totalCharges),
        breakdown: {
          brokerage: round(totalBrokerage),
          stt: round(totalSTT),
          gst: round(totalGST),
          exchangeCharges: round(totalExchange),
          ctt: round(totalCTT),
          sebiCharges: round(totalSEBI),
          stampDuty: round(totalStampDuty),
          dpCharges: round(totalDP)
        },
        percentages: {
          brokerage: totalCharges > 0 ? round((totalBrokerage / totalCharges) * 100) : 0,
          stt: totalCharges > 0 ? round((totalSTT / totalCharges) * 100) : 0,
          gst: totalCharges > 0 ? round((totalGST / totalCharges) * 100) : 0,
          exchangeCharges: totalCharges > 0 ? round((totalExchange / totalCharges) * 100) : 0,
          ctt: totalCharges > 0 ? round((totalCTT / totalCharges) * 100) : 0,
          sebiCharges: totalCharges > 0 ? round((totalSEBI / totalCharges) * 100) : 0,
          stampDuty: totalCharges > 0 ? round((totalStampDuty / totalCharges) * 100) : 0,
          dpCharges: totalCharges > 0 ? round((totalDP / totalCharges) * 100) : 0
        },
        chargesToTurnoverPercent: totalTurnover > 0 ? round((totalCharges / totalTurnover) * 100) : 0,
        avgChargePerTrade: tradesInRange.length > 0 ? round(totalCharges / tradesInRange.length) : 0,
        timeline,
        topSymbols,
        recentTrades: tradesWithCharges.slice(0, 50)
      }
    });
  } catch (error) {
    console.error("Charges analytics error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to calculate charges analytics" });
  }
};

