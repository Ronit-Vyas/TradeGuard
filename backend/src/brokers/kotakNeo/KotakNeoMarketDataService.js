import KotakNeoAdapter from "./KotakNeoAdapter.js";

class KotakNeoMarketDataService {
    constructor() {
        this.streamers = new Map();     // userId -> active stream/polling object
        this.subscribers = new Map();   // userId -> Set of instrument keys
    }

    /**
     * Start market data streaming for a Kotak Neo user
     * @param {string} userId - User identifier
     * @param {string} accessToken - Kotak Neo trade/session token
     * @param {Array<string>} instrumentKeys - List of symbols (e.g. ['RELIANCE', 'TCS'])
     * @param {Function} onMarketData - Callback invoked with price tick data
     * @param {string} [sid] - Session ID (optional, defaults to accessToken)
     * @param {string} [consumerKey] - Consumer Key (optional)
     */
    async start(userId, accessToken, instrumentKeys, onMarketData, sid = null, consumerKey = null) {
        if (!userId) {
            throw new Error("userId is required");
        }

        if (!accessToken) {
            throw new Error("Kotak Neo access token is required");
        }

        if (!Array.isArray(instrumentKeys) || instrumentKeys.length === 0) {
            throw new Error("No instrument keys supplied");
        }

        // Stop existing stream for this user
        await this.stop(userId);

        const adapter = new KotakNeoAdapter({
            accessToken,
            sid: sid || accessToken,
            consumerKey: consumerKey || ""
        });

        this.subscribers.set(userId, new Set(instrumentKeys));

        console.log(`[KotakNeoMarketData] Initializing market data for user ${userId} (${instrumentKeys.length} instruments)`);

        // Poll quote API at regular intervals to provide real-time updates for Kotak Neo instruments
        const pollQuotes = async () => {
            try {
                const keys = Array.from(this.subscribers.get(userId) || []);
                if (keys.length === 0) return;

                for (const sym of keys) {
                    const cleanSym = String(sym).split("|").pop().toUpperCase();
                    const quote = await adapter.getQuotes(cleanSym, "LTP");
                    if (quote) {
                        const ltp = Number(quote?.ltp || quote?.lastPrice || quote?.close || quote?.data?.[0]?.ltp);
                        if (ltp && !isNaN(ltp)) {
                            onMarketData({
                                broker: "KOTAK_NEO",
                                instrumentKey: sym,
                                symbol: cleanSym,
                                ltp,
                                timestamp: new Date()
                            });
                        }
                    }
                }
            } catch (err) {
                // Ignore transient network errors
            }
        };

        // Initial poll
        pollQuotes();

        // 2-second interval polling for quotes
        const intervalId = setInterval(pollQuotes, 2000);

        this.streamers.set(userId, {
            adapter,
            intervalId,
            disconnect: () => clearInterval(intervalId)
        });

        return {
            connected: true,
            instrumentKeys
        };
    }

    async stop(userId) {
        const stream = this.streamers.get(userId);
        if (stream) {
            try {
                if (typeof stream.disconnect === "function") {
                    stream.disconnect();
                }
            } catch (error) {
                console.error(`[KotakNeoMarketData] Error stopping for ${userId}:`, error.message);
            }
            this.streamers.delete(userId);
        }
        this.subscribers.delete(userId);
    }

    async subscribe(userId, instrumentKeys) {
        const set = this.subscribers.get(userId);
        if (set && Array.isArray(instrumentKeys)) {
            instrumentKeys.forEach(k => set.add(k));
        }
    }

    async unsubscribe(userId, instrumentKeys) {
        const set = this.subscribers.get(userId);
        if (set && Array.isArray(instrumentKeys)) {
            instrumentKeys.forEach(k => set.delete(k));
        }
    }

    async getQuotes(symbols, accessToken, sid = null, consumerKey = null) {
        const adapter = new KotakNeoAdapter({
            accessToken,
            sid: sid || accessToken,
            consumerKey: consumerKey || ""
        });
        const symList = Array.isArray(symbols) ? symbols : [symbols];
        const results = {};
        for (const s of symList) {
            results[s] = await adapter.getQuotes(s);
        }
        return results;
    }
}

export default new KotakNeoMarketDataService();
