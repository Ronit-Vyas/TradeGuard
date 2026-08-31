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


    const accessToken =
        decrypt(
            brokerAccount.credentials.accessToken
        );

    if (!accessToken) {
        throw new Error(
            "Failed to decrypt Upstox access token"
        );
    }

    const upstox =
        new UpstoxAdapter(accessToken);

    const trades =
        await upstox.getHistoricalTrades({

            startDate,

            endDate,

            pageNumber: 1,

            pageSize: 100
        });

    if (!Array.isArray(trades)) {
        throw new Error(
            "Invalid historical trades response from Upstox"
        );
    }

    let inserted = 0;

    let updated = 0;

    let skipped = 0;

    for (const trade of trades) {

        try {


            const mappedTrade =
                mapUpstoxTrade(trade);

            mappedTrade.userId =
                brokerAccount.userId;

            mappedTrade.brokerAccountId =
                brokerAccount._id;

            if (!mappedTrade.tradeId) {

                console.warn(
                    "Skipping trade because tradeId is missing:",
                    trade
                );

                skipped++;

                continue;
            }

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
            }

            else if (result.modifiedCount === 1) {
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

    return {

        broker:
            "UPSTOX",

        brokerAccountId:
            brokerAccount._id,

        startDate,

        endDate,

        fetched:
            trades.length,

        inserted,

        updated,

        skipped
    };
};

export {
    syncUpstoxHistoricalTrades
};