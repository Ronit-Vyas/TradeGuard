class RiskRewardEngine {

    calculate({
        side,
        entryPrice,
        stopLoss,
        target,
        ltp
    }) {

        entryPrice = Number(entryPrice);
        stopLoss = Number(stopLoss);
        target = Number(target);
        ltp = Number(ltp);

        if (
            !entryPrice ||
            !stopLoss ||
            !target ||
            !ltp
        ) {
            return null;
        }

        let risk;
        let reward;

        if (side === "BUY") {

            risk =
                entryPrice - stopLoss;

            reward =
                target - entryPrice;

        } else {

            risk =
                stopLoss - entryPrice;

            reward =
                entryPrice - target;
        }

        if (risk <= 0 || reward <= 0) {
            return null;
        }

        return {
            entryPrice,
            stopLoss,
            target,
            ltp,

            initialRisk: risk,

            initialReward: reward,

            initialRiskReward:
                reward / risk,

            distanceToStopLoss:
                side === "BUY"
                    ? ltp - stopLoss
                    : stopLoss - ltp,

            distanceToTarget:
                side === "BUY"
                    ? target - ltp
                    : ltp - target
        };
    }
}

module.exports = new RiskRewardEngine();