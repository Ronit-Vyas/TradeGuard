import axios from "axios";

class KotakNeoAdapter {
    constructor({ accessToken, sid, consumerKey }) {
        if (!accessToken) {
            throw new Error("Kotak Neo access token is required");
        }

        this.accessToken = String(accessToken).trim();
        this.sid = sid ? String(sid).trim() : "";
        this.consumerKey = consumerKey ? String(consumerKey).trim() : "";
        // Updated to use the correct Kotak Neo API trade servers
        this.baseURL = "https://e21.kotaksecurities.com";
        this.fallbackURL = "https://e41.kotaksecurities.com";

        this.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            // Authorization header for access token
            "Authorization": `Bearer ${this.accessToken}`,
            // Optional consumerKey header if provided
            ...(this.consumerKey ? { "consumerKey": this.consumerKey } : {}),
            "neo-fin-key": "neotradeapi"
        };

        // sid (Session ID) is sent as a separate header if available
        if (this.sid) {
            this.headers["Sid"] = this.sid;
        }

        // consumerKey / apiKey used for API trading plan users (set as separate header)
        if (this.consumerKey) {
            this.headers["consumerKey"] = this.consumerKey;
        }

        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
            headers: this.headers
        });
    }

    async _request(method, path, options = {}) {
        const servers = [
            this.baseURL,
            this.fallbackURL,
            "https://e43.kotaksecurities.com",
            "https://e22.kotaksecurities.com"
        ];

        let lastError;
        for (const serverUrl of servers) {
            try {
                const client = axios.create({
                    baseURL: serverUrl,
                    timeout: 10000,
                    headers: this.headers
                });
                return await client.request({
                    method,
                    url: path,
                    ...options
                });
            } catch (error) {
                lastError = error;
                // If it's a 4xx error (like 401 unauthorized), don't retry other servers, just throw it
                // We only retry on 5xx or connection/DNS errors
                if (error.response && error.response.status >= 400 && error.response.status < 500) {
                    throw error;
                }
            }
        }
        throw lastError;
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
                // Check if session token expired or unauthorized
                if (
                    err.response?.status === 401 ||
                    err.response?.status === 403 ||
                    err.response?.data?.stCode === 100022 ||
                    err.response?.data?.errMsg?.toLowerCase().includes("session") ||
                    err.response?.data?.errMsg?.toLowerCase().includes("unauthorized") ||
                    err.response?.data?.errMsg?.toLowerCase().includes("invalid token")
                ) {
                    throw new Error(
                        "Kotak Neo session has expired or token is invalid. " +
                        "Please update your Access Token and Session ID (sid) in Broker Accounts. " +
                        "Kotak Neo tokens are valid only for the current trading day."
                    );
                }
                // Try fetching from user orders if trades endpoint is restricted
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

