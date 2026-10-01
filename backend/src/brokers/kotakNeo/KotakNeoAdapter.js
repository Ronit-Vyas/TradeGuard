import axios from "axios";

class KotakNeoAdapter {
    constructor({ accessToken, sid, consumerKey }) {
        if (!accessToken) {
            throw new Error("Kotak Neo access token is required");
        }

        this.accessToken = String(accessToken).trim();
        this.sid = sid ? String(sid).trim() : this.accessToken;
        this.consumerKey = consumerKey ? String(consumerKey).trim() : "";
        this.baseURL = "https://mis.kotaksecurities.com";
        this.fallbackURL = "https://cis.kotaksecurities.com";

        this.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Auth": this.accessToken,
            "Sid": this.sid,
            "neo-fin-key": "neotradeapi"
        };

        if (this.consumerKey) {
            this.headers["Authorization"] = this.consumerKey;
        }

        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
            headers: this.headers
        });
    }

    async _request(method, path, options = {}) {
        try {
            return await this.client.request({
                method,
                url: path,
                ...options
            });
        } catch (error) {
            // If primary gateway fails or is unreachable, retry on alternate gateway URL
            if (!error.response || error.response?.status >= 500 || error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
                try {
                    const fallbackClient = axios.create({
                        baseURL: this.fallbackURL,
                        timeout: 10000,
                        headers: this.headers
                    });
                    return await fallbackClient.request({
                        method,
                        url: path,
                        ...options
                    });
                } catch (fallbackError) {
                    throw fallbackError;
                }
            }
            throw error;
        }
    }

    // --------------------------------------------------
    // TRADE REPORT / TRADES
    // Official Endpoint: /quick/user/trades
    // --------------------------------------------------
    async getTrades(orderId = "") {
        try {
            const params = {};
            if (orderId) {
                params.order_id = orderId;
            }

            let response;
            try {
                response = await this._request("GET", "/quick/user/trades", { params });
            } catch (err) {
                // Check if session token expired
                if (err.response?.data?.stCode === 100022 || err.response?.data?.errMsg?.includes("session")) {
                    throw new Error("Kotak Neo session has expired. Please update your session token in Broker Accounts.");
                }
                // Try fetching from user orders if trades endpoint is empty or restricted
                try {
                    response = await this._request("GET", "/quick/user/orders", { params });
                } catch {
                    throw err;
                }
            }

            const data = response?.data;
            if (Array.isArray(data)) {
                return data;
            }
            if (Array.isArray(data?.data)) {
                return data.data;
            }
            if (data?.stat === "Ok" && Array.isArray(data?.result)) {
                return data.result;
            }
            return [];
        } catch (error) {
            console.error(
                "Kotak Neo Trades Error:",
                error.response?.data || error.message
            );
            const errMsg =
                error.response?.data?.errMsg ||
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Failed to fetch trades from Kotak Neo";
            throw new Error(`Failed to fetch trades from Kotak Neo: ${errMsg}`);
        }
    }

    // --------------------------------------------------
    // HISTORICAL TRADES (Filtered by date range)
    // --------------------------------------------------
    async getHistoricalTrades({ startDate, endDate }) {
        const allTrades = await this.getTrades();
        if (!startDate || !endDate) return allTrades;

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return allTrades.filter(t => {
            const rawDate = t.hsUpTm || t.exTm || t.flDt || t.trade_date || t.timestamp;
            if (!rawDate) return true;
            const tradeDate = new Date(rawDate);
            if (isNaN(tradeDate.getTime())) return true;
            return tradeDate >= start && tradeDate <= end;
        });
    }

    // --------------------------------------------------
    // TODAY'S TRADES
    // --------------------------------------------------
    async getTradesForDay() {
        return this.getTrades();
    }

    // --------------------------------------------------
    // POSITIONS
    // Official Endpoint: /quick/user/positions
    // --------------------------------------------------
    async getPositions() {
        try {
            const response = await this._request("GET", "/quick/user/positions");
            const data = response?.data;
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.data)) return data.data;
            if (data?.stat === "Ok" && Array.isArray(data?.result)) return data.result;
            return [];
        } catch (error) {
            console.error(
                "Kotak Neo Positions Error:",
                error.response?.data || error.message
            );
            const errMsg = error.response?.data?.errMsg || error.message;
            throw new Error(`Failed to fetch positions from Kotak Neo: ${errMsg}`);
        }
    }

    // --------------------------------------------------
    // ORDERS
    // Official Endpoint: /quick/user/orders
    // --------------------------------------------------
    async getOrders() {
        try {
            const response = await this._request("GET", "/quick/user/orders");
            const data = response?.data;
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.data)) return data.data;
            if (data?.stat === "Ok" && Array.isArray(data?.result)) return data.result;
            return [];
        } catch (error) {
            console.error(
                "Kotak Neo Orders Error:",
                error.response?.data || error.message
            );
            const errMsg = error.response?.data?.errMsg || error.message;
            throw new Error(`Failed to fetch orders from Kotak Neo: ${errMsg}`);
        }
    }

    // --------------------------------------------------
    // HOLDINGS
    // Official Endpoint: /portfolio/v1/holdings
    // --------------------------------------------------
    async getHoldings() {
        try {
            const response = await this._request("GET", "/portfolio/v1/holdings");
            const data = response?.data;
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.data)) return data.data;
            return [];
        } catch (error) {
            console.error("Kotak Neo Holdings Error:", error.response?.data || error.message);
            return [];
        }
    }

    // --------------------------------------------------
    // LIMITS / MARGINS
    // Official Endpoint: /quick/user/limits
    // --------------------------------------------------
    async getLimits() {
        try {
            const response = await this._request("GET", "/quick/user/limits");
            return response?.data;
        } catch (error) {
            console.error("Kotak Neo Limits Error:", error.response?.data || error.message);
            return null;
        }
    }

    // --------------------------------------------------
    // MARKET DATA: QUOTES
    // Official Endpoint: /script-details/1.0/quotes/neosymbol/{symbols}/{quoteType}
    // --------------------------------------------------
    async getQuotes(neoSymbols = "", quoteType = "LTP") {
        try {
            if (!neoSymbols) return null;
            const path = `/script-details/1.0/quotes/neosymbol/${encodeURIComponent(neoSymbols)}/${encodeURIComponent(quoteType)}`;
            const response = await this._request("GET", path);
            return response?.data;
        } catch (error) {
            console.error("Kotak Neo Quotes Error:", error.response?.data || error.message);
            return null;
        }
    }

    // --------------------------------------------------
    // MARKET DATA: HISTORICAL CANDLE DATA
    // Official Endpoint: /market-data/1.0/historical/details
    // --------------------------------------------------
    async getHistoricalCandles(params = {}) {
        try {
            const response = await this._request("GET", "/market-data/1.0/historical/details", { params });
            return response?.data;
        } catch (error) {
            console.error("Kotak Neo Historical Candles Error:", error.response?.data || error.message);
            return null;
        }
    }
}

export default KotakNeoAdapter;

