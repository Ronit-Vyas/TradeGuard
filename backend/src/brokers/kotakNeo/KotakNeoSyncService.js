import KotakNeoAdapter from "./KotakNeoAdapter.js";
import { mapKotakNeoTrade } from "./KotakNeoMapper.js";
import BrokerAccount from "../../models/BrokerAccount.js";
import TradeRecord from "../../models/TradeRecord.js";
import { decrypt, encrypt } from "../../utils/encryption.js";

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

    let accessToken = brokerAccount.credentials?.accessToken
        ? decrypt(brokerAccount.credentials.accessToken)
        : "";

    const sid = brokerAccount.credentials?.refreshToken
        ? decrypt(brokerAccount.credentials.refreshToken)
        : "";

    const consumerKey = brokerAccount.credentials?.apiKey
        ? decrypt(brokerAccount.credentials.apiKey)
        : "";

    const mpin = brokerAccount.credentials?.password
        ? decrypt(brokerAccount.credentials.password)
        : "";

    const totpSecret = brokerAccount.credentials?.totpSecret
        ? decrypt(brokerAccount.credentials.totpSecret)
        : "";

    const ucc = brokerAccount.clientId || "";

    const canAutoLogin = !!(consumerKey && (ucc || brokerAccount.credentials?.mobileNumber) && mpin && totpSecret);

    if (!accessToken && !canAutoLogin) {
        throw new Error(
            "Kotak Neo access token not found. " +
            "Please provide your Kotak Neo Trade Access Token and Session ID (sid), " +
            "or enter your Trading MPIN and TOTP Secret for automatic login."
        );
    }

    const adapter = new KotakNeoAdapter({
        accessToken,
        sid,
        consumerKey,
        ucc,
        mpin,
        totpSecret
    });

    // If no access token but auto-login is available, login first
    if (!accessToken && canAutoLogin) {
        try {
            console.log(`[Kotak Neo Sync] Authenticating account ${brokerAccountId} with TOTP...`);
            const session = await adapter.loginWithTotp();
            if (session.accessToken) {
                brokerAccount.credentials.accessToken = encrypt(session.accessToken);
                if (session.sid) brokerAccount.credentials.refreshToken = encrypt(session.sid);
                brokerAccount.isConnected = true;
                brokerAccount.lastConnectedAt = new Date();
                await brokerAccount.save();
                console.log(`[Kotak Neo Sync] Successfully authenticated and updated session tokens`);
            }
        } catch (loginErr) {
            throw new Error(`Kotak Neo TOTP authentication failed: ${loginErr.message}`);
        }
    }

    console.log(`[Kotak Neo Sync] Fetching trades for account ${brokerAccountId} (${startDate || "all"} - ${endDate || "all"})`);

    let trades = [];
    try {
        if (startDate && endDate) {
            trades = await adapter.getHistoricalTrades({ startDate, endDate });
        } else {
            trades = await adapter.getTrades();
        }
    } catch (err) {
        // If expired and can auto login, try once more
        if (canAutoLogin && (err.message.includes("expired") || err.message.includes("200002") || err.message.includes("format error"))) {
            try {
                console.log(`[Kotak Neo Sync] Session expired, re-authenticating with TOTP...`);
                const session = await adapter.loginWithTotp();
                if (session.accessToken) {
                    brokerAccount.credentials.accessToken = encrypt(session.accessToken);
                    if (session.sid) brokerAccount.credentials.refreshToken = encrypt(session.sid);
                    brokerAccount.isConnected = true;
                    brokerAccount.lastConnectedAt = new Date();
                    await brokerAccount.save();

                    if (startDate && endDate) {
                        trades = await adapter.getHistoricalTrades({ startDate, endDate });
                    } else {
                        trades = await adapter.getTrades();
                    }
                }
            } catch (retryErr) {
                throw new Error(`Failed to fetch trades after re-authentication: ${retryErr.message}`);
            }
        } else {
            throw err;
        }
    }

    // If trade report is empty, also inspect executed orders from the order book
    if (!Array.isArray(trades) || trades.length === 0) {
        try {
            const orders = await adapter.getOrders();
            const executedOrders = (Array.isArray(orders) ? orders : []).filter(o => {
                const filledQty = Number(o.fldQty || o.filledQuantity || o.qty || 0);
                const status = String(o.ordSt || o.status || "").toLowerCase();
                return filledQty > 0 || status === "complete" || status === "trad" || status === "filled";
            });
            if (executedOrders.length > 0) {
                console.log(`[Kotak Neo Sync] Found ${executedOrders.length} executed orders in order book`);
                trades = executedOrders;
            }
        } catch (orderErr) {
            console.warn("[Kotak Neo Sync] Notice inspecting order book:", orderErr.message);
        }
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

    // Update last sync timestamp on account
    brokerAccount.lastSyncAt = new Date();
    brokerAccount.isConnected = true;
    brokerAccount.lastConnectedAt = new Date();
    await brokerAccount.save();

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
