class PnlEngine {
    constructor() {
        this.positions = new Map();
        this.latestPrices = new Map();
    }

    setPositions(userId, positions) {
        this.positions.set(userId, positions);
    }

    updatePrice(userId, instrumentKey, ltp) {
        if (!this.latestPrices.has(userId)) {
            this.latestPrices.set(userId, new Map());
        }

        this.latestPrices
            .get(userId)
            .set(instrumentKey, Number(ltp));

        return this.calculate(userId);
    }

    calculate(userId) {
        const positions = this.positions.get(userId) || [];

        const prices =
            this.latestPrices.get(userId) || new Map();

        let totalUnrealised = 0;
        let totalRealised = 0;

        const result = positions.map(position => {

            const instrumentKey =
                position.instrument_token;

            const ltp =
                prices.get(instrumentKey) ??
                Number(position.last_price ?? 0);

            const quantity =
                Number(position.quantity ?? 0);

            const averagePrice =
                Number(position.average_price ?? 0);

            /*
             * Positive quantity = long
             * Negative quantity = short
             */
            const unrealised =
                (ltp - averagePrice) * quantity;

            const realised =
                Number(position.realised ?? 0);

            totalUnrealised += unrealised;
            totalRealised += realised;

            return {
                instrumentKey,

                symbol:
                    position.trading_symbol,

                quantity,

                averagePrice,

                ltp,

                unrealised,

                realised,

                pnl: unrealised + realised
            };
        });

        return {
            userId,

            totalUnrealised,

            totalRealised,

            totalPnl:
                totalUnrealised + totalRealised,

            positions: result,

            timestamp: Date.now()
        };
    }
}

module.exports = new PnlEngine();