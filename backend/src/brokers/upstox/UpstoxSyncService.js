import UpstoxAdapter from "./UpstoxAdaptor.js";

import { mapUpstoxTrade } from "./UpstoxMapper.js";

import BrokerAccount from "../../models/BrokerAccount.js";
import TradeRecord from "../../models/TradeRecord.js";

import { decrypt } from "../../utils/encryption.js";


const getUpstoxAdapter = async (brokerAccountId) => {
    if (!brokerAccountId) {
        throw new Error("brokerAccountId is required");
    }

    const brokerAccount = await BrokerAccount.findById(
        brokerAccountId
    );

    if (!brokerAccount) {
        throw new Error("Broker account not found");
    }

    if (brokerAccount.broker !== "UPSTOX") {
        throw new Error("Broker account is not an Upstox account");
    }

    if (!brokerAccount.isActive) {
        throw new Error("Upstox broker account is inactive");
    }

    if (!brokerAccount.credentials?.accessToken) {
        throw new Error("Upstox access token not found");
    }

    const accessToken = decrypt(
        brokerAccount.credentials.accessToken
    );

    if (!accessToken) {
        throw new Error("Failed to decrypt Upstox access token");
    }

    return {
        brokerAccount,
        upstox: new UpstoxAdapter(accessToken)
    };
};


const saveUpstoxTrades = async (brokerAccount, trades) => {
    if (!Array.isArray(trades)) {
        throw new Error("Invalid trades response from Upstox");
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const trade of trades) {
        try {
            const mappedTrade = mapUpstoxTrade(trade);

            mappedTrade.userId = brokerAccount.userId;
            mappedTrade.brokerAccountId = brokerAccount._id;

            const result = await TradeRecord.updateOne(
                {
                    brokerAccountId: brokerAccount._id,
                    tradeId: mappedTrade.tradeId
                },
                {
                    $set: mappedTrade
                },
                {
                    upsert: true,
                    runValidators: true
                }
            );

            if (result.upsertedCount === 1) {
                inserted++;
            } else if (result.modifiedCount === 1) {
                updated++;
            }
        } catch (error) {
            console.error(
                "Failed to save Upstox trade:",
                error.message,
                "Trade data:",
                JSON.stringify(trade).slice(0, 200)
            );

            skipped++;
        }
    }

    return {
        fetched: trades.length,
        inserted,
        updated,
        skipped
    };
};


// Historical/backfill sync
const syncUpstoxHistoricalTrades = async ({
    brokerAccountId,
    startDate,
    endDate
}) => {
    if (!startDate || !endDate) {
        throw new Error("startDate and endDate are required");
    }

    const { brokerAccount, upstox } =
        await getUpstoxAdapter(brokerAccountId);

    const trades = await upstox.getHistoricalTrades({
        startDate,
        endDate,
        pageNumber: 1,
        pageSize: 4999
    });

    const result = await saveUpstoxTrades(
        brokerAccount,
        trades
    );

    return {
        broker: "UPSTOX",
        syncType: "HISTORICAL",
        brokerAccountId: brokerAccount._id,
        startDate,
        endDate,
        ...result
    };
};


// Current-day trade sync
const syncUpstoxTodayTrades = async ({
    brokerAccountId
}) => {
    const { brokerAccount, upstox } =
        await getUpstoxAdapter(brokerAccountId);

    const trades = await upstox.getTradesForDay();

    console.log(
        `Upstox daily endpoint returned ${trades.length} trades`
    );

    const result = await saveUpstoxTrades(
        brokerAccount,
        trades
    );

    return {
        broker: "UPSTOX",
        syncType: "TODAY",
        brokerAccountId: brokerAccount._id,
        ...result
    };
};


export {
    syncUpstoxHistoricalTrades,
    syncUpstoxTodayTrades
};