import UpstoxAdapter from "./UpstoxAdaptor.js";

import {
    mapUpstoxTrade
} from "./UpstoxMapper.js";

import BrokerAccount from "../../models/BrokerAccount.js";
import TradeRecord from "../../models/TradeRecord.js";

import { decrypt } from "../../utils/encryption.js";


const syncUpstoxHistoricalTrades = async ({
    brokerAccountId,
    startDate,
    endDate
}) => {

    // ==================================================
    // VALIDATION
    // ==================================================

    if (!brokerAccountId) {
        throw new Error(
            "brokerAccountId is required"
        );
    }

    if (!startDate || !endDate) {
        throw new Error(
            "startDate and endDate are required"
        );
    }


    // ==================================================
    // GET BROKER ACCOUNT
    // ==================================================

    const brokerAccount =
        await BrokerAccount.findById(
            brokerAccountId
        );


    if (!brokerAccount) {
        throw new Error(
            "Broker account not found"
        );
    }


    if (brokerAccount.broker !== "UPSTOX") {
        throw new Error(
            "Broker account is not an Upstox account"
        );
    }


    if (!brokerAccount.isActive) {
        throw new Error(
            "Upstox broker account is inactive"
        );
    }


    if (!brokerAccount.credentials?.accessToken) {
        throw new Error(
            "Upstox access token not found"
        );
    }


    // ==================================================
    // DECRYPT ACCESS TOKEN
    // ==================================================

    const accessToken =
        decrypt(
            brokerAccount.credentials.accessToken
        );


    if (!accessToken) {
        throw new Error(
            "Failed to decrypt Upstox access token"
        );
    }


    console.log(
        "Upstox access token decrypted successfully"
    );


    const upstox =
        new UpstoxAdapter(accessToken);


    // ==================================================
    // 1. FETCH ALL HISTORICAL TRADES
    // ==================================================

    let historicalTrades = [];

    let pageNumber = 1;

    const pageSize = 5000;


    while (true) {

        console.log(
            `Fetching Upstox historical trades - page ${pageNumber}`
        );


        const result =
            await upstox.getHistoricalTrades({

                startDate,

                endDate,

                pageNumber,

                pageSize

            });


        const pageTrades =
            result.trades;


        if (
            !Array.isArray(pageTrades) ||
            pageTrades.length === 0
        ) {

            console.log(
                `No more historical trades on page ${pageNumber}`
            );

            break;
        }


        historicalTrades.push(
            ...pageTrades
        );


        console.log(
            `Historical page ${pageNumber}: ${pageTrades.length} trades`
        );


        // If less than pageSize,
        // this is the final page.
        if (pageTrades.length < pageSize) {
            break;
        }


        pageNumber++;
    }


    console.log(
        "Total historical trades fetched:",
        historicalTrades.length
    );


    // ==================================================
    // 2. FETCH TODAY'S TRADES
    // ==================================================

    let todayTrades = [];


    try {

        todayTrades =
            await upstox.getTradesForDay();


        if (!Array.isArray(todayTrades)) {
            todayTrades = [];
        }


        console.log(
            "Today's trades fetched:",
            todayTrades.length
        );

    } catch (error) {

        console.error(
            "Failed to fetch today's trades:",
            error.message
        );

        // Don't completely fail historical sync
        // just because today's endpoint failed.
        todayTrades = [];
    }


    // ==================================================
    // 3. COMBINE BOTH SOURCES
    // ==================================================

    const allTrades = [
        ...historicalTrades,
        ...todayTrades
    ];


    console.log(
        "Total trades before deduplication:",
        allTrades.length
    );


    // ==================================================
    // 4. REMOVE DUPLICATE TRADE IDs
    // ==================================================

    const uniqueTradesMap =
        new Map();


    for (const trade of allTrades) {

        if (!trade?.trade_id) {

            console.warn(
                "Skipping trade without trade_id:",
                trade
            );

            continue;
        }


        const tradeId =
            String(trade.trade_id);


        uniqueTradesMap.set(
            tradeId,
            trade
        );
    }


    const trades =
        Array.from(
            uniqueTradesMap.values()
        );


    console.log(
        "Unique trades to save:",
        trades.length
    );


    // ==================================================
    // 5. SAVE TRADES
    // ==================================================

    let inserted = 0;

    let updated = 0;

    let skipped = 0;


    // --------------------------------------------------
    // PRESERVE EXISTING ORDER IDs
    //
    // The historical-trades API never returns order_id,
    // so a re-sync would otherwise overwrite an
    // already-captured orderId with null. Load the
    // stored orderIds once and merge them back in.
    // --------------------------------------------------

    const tradeIdsToSave =
        trades.map((trade) =>
            String(trade.trade_id)
        );


    const existingRecords =
        await TradeRecord.find(

            {
                brokerAccountId:
                    brokerAccount._id,

                tradeId: {
                    $in: tradeIdsToSave
                }
            },

            {
                tradeId: 1,
                orderId: 1
            }

        );


    const storedOrderIds =
        new Map(
            existingRecords.map(
                (record) => [
                    record.tradeId,
                    record.orderId
                ]
            )
        );


    for (const trade of trades) {

        try {

            const mappedTrade =
                mapUpstoxTrade(trade);


            mappedTrade.userId =
                brokerAccount.userId;


            mappedTrade.brokerAccountId =
                brokerAccount._id;


            mappedTrade.broker =
                "UPSTOX";


            // ------------------------------------------
            // TRADE ID IS REQUIRED
            // ------------------------------------------

            if (!mappedTrade.tradeId) {

                console.warn(
                    "Skipping trade because tradeId is missing:",
                    trade
                );

                skipped++;

                continue;
            }


            // ------------------------------------------
            // KEEP STORED ORDER ID WHEN THE CURRENT
            // PAYLOAD DOESN'T INCLUDE ONE
            // ------------------------------------------

            if (!mappedTrade.orderId) {

                const storedOrderId =
                    storedOrderIds.get(
                        mappedTrade.tradeId
                    );


                if (storedOrderId) {

                    mappedTrade.orderId =
                        storedOrderId;

                }

            }


            // ------------------------------------------
            // UPSERT
            // ------------------------------------------

            const result =
                await TradeRecord.updateOne(

                    {
                        brokerAccountId:
                            brokerAccount._id,

                        tradeId:
                            mappedTrade.tradeId
                    },

                    {
                        $set:
                            mappedTrade
                    },

                    {
                        upsert: true
                    }
                );


            if (result.upsertedCount === 1) {

                inserted++;

            } else if (
                result.modifiedCount === 1
            ) {

                updated++;

            } else {

                // Existing document but no changes
                updated++;
            }


        } catch (error) {

            console.error(
                "Failed to save Upstox trade:",
                error.message
            );

            skipped++;
        }
    }


    // ==================================================
    // FINAL RESULT
    // ==================================================

    console.log(
        "===================================="
    );

    console.log(
        "UPSTOX SYNC COMPLETED"
    );

    console.log(
        "Historical fetched:",
        historicalTrades.length
    );

    console.log(
        "Today's fetched:",
        todayTrades.length
    );

    console.log(
        "Combined:",
        allTrades.length
    );

    console.log(
        "Unique:",
        trades.length
    );

    console.log(
        "Inserted:",
        inserted
    );

    console.log(
        "Updated:",
        updated
    );

    console.log(
        "Skipped:",
        skipped
    );

    console.log(
        "===================================="
    );


    return {

        broker:
            "UPSTOX",


        brokerAccountId:
            brokerAccount._id,


        startDate,


        endDate,


        historicalFetched:
            historicalTrades.length,


        todayFetched:
            todayTrades.length,


        totalFetched:
            allTrades.length,


        uniqueTrades:
            trades.length,


        inserted,


        updated,


        skipped
    };
};


const syncUpstoxTodayTrades = async ({
    brokerAccountId
}) => {

    if (!brokerAccountId) {
        throw new Error(
            "brokerAccountId is required"
        );
    }


    // Sync today's date through the standard flow so
    // both the historical endpoint and the
    // get-trades-for-day endpoint are used. The
    // latter is the only one that returns order_id.
    const now = new Date();

    const dateStr =
        now.toISOString().split("T")[0];


    return syncUpstoxHistoricalTrades({

        brokerAccountId,

        startDate: dateStr,

        endDate: dateStr

    });

};


export {
    syncUpstoxHistoricalTrades,
    syncUpstoxTodayTrades
};