import {
  calculateCharges,
  calculatePnL,
  calculateBreakEven,
  calculateRiskReward,
  calculatePosition,
  calculateDashboardStats
} from "./calculations.js";

// Example rates for testing only.
// Replace these with your verified broker/segment configuration.
const brokerConfig = {
  brokerage: {
    type: "PER_ORDER",
    perOrder: 20
  },
  stt: {
    buyRate: 0,
    sellRate: 0.001,
    appliesTo: "SELL"
  },
  exchange: {
    rate: 0.00003
  },
  sebi: {
    ratePerCrore: 10
  },
  stampDuty: {
    buyRate: 0.00003
  },
  gst: {
    rate: 0.18
  },
  dp: {
    perSellTransaction: 15.93
  }
};

console.log("\n========== CHARGES TEST ==========");

const tradeInput = {
  buyPrice: 100,
  sellPrice: 120,
  quantity: 50,
  buyOrderCount: 1,
  sellOrderCount: 1,
  isDelivery: false
};

const charges = calculateCharges(tradeInput, brokerConfig);
console.log("Charges:", charges);

console.log("\n========== P&L TEST ==========");

const pnl = calculatePnL(tradeInput, charges);
console.log("P&L:", pnl);

console.log("\n========== BREAK-EVEN TEST ==========");

const breakEven = calculateBreakEven(
  {
    buyPrice: 100,
    quantity: 50,
    targetProfit: 500,
    buyOrderCount: 1,
    sellOrderCount: 1,
    isDelivery: false
  },
  brokerConfig
);

console.log("Break-even:", breakEven);

console.log("\n========== RISK/REWARD TEST ==========");

const riskReward = calculateRiskReward({
  entryPrice: 100,
  stopLoss: 95,
  targetPrice: 115,
  quantity: 50,
  capital: 100000,
  maxRiskPercent: 1,
  direction: "LONG"
});

console.log("Risk/reward:", riskReward);

console.log("\n========== POSITION TEST ==========");

const trades = [
  {
    tradeId: "T1",
    brokerAccountId: "ACCOUNT1",
    symbol: "NIFTY 24000 CE",
    exchange: "NSE",
    segment: "OPTIONS",
    productType: "INTRADAY",
    transactionType: "BUY",
    quantity: 375,
    executedPrice: 100,
    tradeTime: "2026-09-25T09:30:00"
  },
  {
    tradeId: "T2",
    brokerAccountId: "ACCOUNT1",
    symbol: "NIFTY 24000 CE",
    exchange: "NSE",
    segment: "OPTIONS",
    productType: "INTRADAY",
    transactionType: "SELL",
    quantity: 100,
    executedPrice: 120,
    tradeTime: "2026-09-25T10:30:00"
  },
  {
    tradeId: "T3",
    brokerAccountId: "ACCOUNT1",
    symbol: "NIFTY 24000 CE",
    exchange: "NSE",
    segment: "OPTIONS",
    productType: "INTRADAY",
    transactionType: "SELL",
    quantity: 50,
    executedPrice: 130,
    tradeTime: "2026-09-26T10:30:00"
  }
];

const positions = calculatePosition(trades);
console.log("Positions:", positions);

console.log("\n========== DASHBOARD TEST ==========");

const completedTrades = [
  {
    tradeTime: "2026-09-25T10:30:00",
    netPnL: 1000,
    grossPnL: 1050,
    totalCharges: 50,
    broker: "UPSTOX"
  },
  {
    tradeTime: "2026-09-25T11:30:00",
    netPnL: -300,
    grossPnL: -280,
    totalCharges: 20,
    broker: "DHAN"
  }
];

const dashboard = calculateDashboardStats(completedTrades);
console.log("Dashboard:", dashboard);

console.log("\n========== ALL TESTS COMPLETED ==========");