import mongoose from "mongoose";
import TradeRecord from "../models/TradeRecord.js";
import BrokerAccount from "../models/BrokerAccount.js";
import { calculateCharges, calculatePnL } from "../services/calculations.js";
import brokerConfig from "../services/brokers/brokerConfig.js";

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

// FIFO matching of executions; only closed quantity contributes realized P&L.
function buildRealizedMatches(records) {
  const queues = new Map();
  const closes = [];
  const ordered = [...records].filter(t => effectiveTradeDate(t) &&
    Number(t.quantity) > 0 && Number(t.executedPrice) >= 0)
    .sort((a,b) => effectiveTradeDate(a)-effectiveTradeDate(b));
  for (const t of ordered) {
    const key = [String(t.brokerAccountId || ""), t.exchange || "", t.segment || "",
      t.symbol || "", t.productCode || ""].join("|");
    const side = String(t.transactionType || "").toUpperCase();
    if (!["BUY","SELL"].includes(side)) continue;
    const signedQty = side === "BUY" ? Number(t.quantity) : -Number(t.quantity);
    let remaining = Math.abs(signedQty);
    const queue = queues.get(key) || [];
    while (remaining > 0 && queue.length && Math.sign(queue[0].qty) !== Math.sign(signedQty)) {
      const lot = queue[0];
      const matched = Math.min(remaining, Math.abs(lot.qty));
      const pnl = (Number(t.executedPrice) - lot.price) * matched * (lot.qty > 0 ? 1 : -1);
      closes.push({ pnl, quantity: matched, broker: t.broker || "UNKNOWN",
        date: effectiveTradeDate(t), symbol: t.symbol, entryPrice: lot.price,
        exitPrice: Number(t.executedPrice) });
      lot.qty += Math.sign(signedQty) * matched;
      remaining -= matched;
      if (Math.abs(lot.qty) < 1e-9) queue.shift();
    }
    if (remaining > 0) queue.push({ qty: Math.sign(signedQty) * remaining, price: Number(t.executedPrice) });
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
    const range = req.query.range || "30d";
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const cutoff = new Date(now.getTime() - days * 86400000);
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
    const weeklyPnL = [];
    for (let i=3;i>=0;i--) {
      const weekStart = new Date(now.getTime() - (i+1)*7*86400000);
      const weekEnd = new Date(now.getTime() - i*7*86400000);
      const matched = closes.filter(c=>c.date>=weekStart && c.date<weekEnd);
      weeklyPnL.push({ label:`Week ${4-i}`,
        wins: Math.round(matched.filter(c=>c.pnl>0).reduce((s,c)=>s+c.pnl,0)),
        losses: Math.round(matched.filter(c=>c.pnl<0).reduce((s,c)=>s+c.pnl,0)) });
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
