import KotakNeoAdapter from "./KotakNeoAdapter.js";
import { mapKotakNeoTrade } from "./KotakNeoMapper.js";
import BrokerAccount from "../../models/BrokerAccount.js";
import TradeRecord from "../../models/TradeRecord.js";
import { decrypt } from "../../utils/encryption.js";

const syncKotakNeoHistoricalTrades = async ({
    brokerAccountId,
    startDate,
    endDate
}) => {
    if (!brokerAccountId) {
        throw new Error("brokerAccountId is required");
    }

    const brokerAccount = await BrokerAccount.findById(brokerAccountId);
    if (!brokerAccount) {
        throw new Error("Broker account not found");
    }

    if (brokerAccount.broker !== "KOTAK_NEO") {
        throw new Error("Broker account is not a Kotak Neo account");
    }

    if (!brokerAccount.isActive) {
        throw new Error("Kotak Neo broker account is inactive");
    }

    if (!brokerAccount.credentials?.accessToken) {
        throw new Error("Kotak Neo access token not found");
    }

    const accessToken = decrypt(brokerAccount.credentials.accessToken);
    if (!accessToken) {
        throw new Error("Failed to decrypt Kotak Neo access token");
    }

    const sid = brokerAccount.credentials.refreshToken 
        ? decrypt(brokerAccount.credentials.refreshToken) 
        : (brokerAccount.credentials.apiKey ? decrypt(brokerAccount.credentials.apiKey) : "");

    const consumerKey = brokerAccount.credentials.apiKey 
        ? decrypt(brokerAccount.credentials.apiKey) 
        : "";

    const adapter = new KotakNeoAdapter({
        accessToken,
        sid,
        consumerKey
    });

    console.log(`[Kotak Neo Sync] Fetching trades for account ${brokerAccountId} (${startDate || "all"} - ${endDate || "all"})`);

    let trades = [];
    if (startDate && endDate) {
        trades = await adapter.getHistoricalTrades({ startDate, endDate });
    } else {
        trades = await adapter.getTrades();
    }

    console.log(`[Kotak Neo Sync] Fetched ${trades.length} raw trades from Kotak Neo`);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const rawTrade of trades) {
        try {
            const mappedTrade = mapKotakNeoTrade(rawTrade);
            mappedTrade.userId = brokerAccount.userId;
            mappedTrade.brokerAccountId = brokerAccount._id;
            mappedTrade.broker = "KOTAK_NEO";

            if (!mappedTrade.tradeId) {
                skipped++;
                continue;
            }

            const result = await TradeRecord.updateOne(
                {
                    brokerAccountId: brokerAccount._id,
                    tradeId: mappedTrade.tradeId
                },
                {
                    $set: mappedTrade
                },
                {
                    upsert: true
                }
            );

            if (result.upsertedCount === 1) {
                inserted++;
            } else if (result.modifiedCount === 1) {
                updated++;
            } else {
                skipped++;
            }
        } catch (itemError) {
            console.warn("[Kotak Neo Sync] Error processing trade item:", itemError.message);
            skipped++;
        }
    }

    console.log(`[Kotak Neo Sync] Completed: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);

    return {
        inserted,
        updated,
        skipped,
        total: trades.length
    };
};

const syncKotakNeoTodayTrades = async ({ brokerAccountId }) => {
    return syncKotakNeoHistoricalTrades({ brokerAccountId });
};

export {
    syncKotakNeoHistoricalTrades,
    syncKotakNeoTodayTrades
};
