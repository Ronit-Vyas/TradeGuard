import axios from "axios";

class KotakNeoAdapter {
    constructor({ accessToken, sid, consumerKey }) {
        if (!accessToken) {
            throw new Error("Kotak Neo access token is required");
        }

        this.accessToken = accessToken;
        this.sid = sid || "";
        this.consumerKey = consumerKey || "";
        this.baseURL = "https://mis.kotaksecurities.com";
        this.fallbackURL = "https://tradeapi.kotaksecurities.com";

        this.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Auth": this.accessToken,
            "Authorization": `Bearer ${this.accessToken}`,
            "neo-fin-key": "neotradeapi"
        };

        if (this.sid) {
            this.headers["Sid"] = this.sid;
        }

        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 8000,
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
                        timeout: 8000,
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
    // --------------------------------------------------
    async getTrades(orderId = "") {
        try {
            const params = {};
            if (orderId) {
                params.order_id = orderId;
            }

            let response;
            try {
                response = await this._request("GET", "/Orders/2.0/quick/user/trades", { params });
            } catch (err) {
                // Try legacy path if v2 path fails with 404
                if (err.response?.status === 404) {
                    response = await this._request("GET", "/quick/user/trades", { params });
                } else {
                    throw err;
                }
            }

            const data = response.data;
            if (Array.isArray(data)) {
                return data;
            }
            if (Array.isArray(data?.data)) {
                return data.data;
            }
            return [];
        } catch (error) {
            console.error(
                "Kotak Neo Trades Error:",
                error.response?.data || error.message
            );
            throw new Error(
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Failed to fetch trades from Kotak Neo"
            );
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
        // Include full end day
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
    // --------------------------------------------------
    async getPositions() {
        try {
            let response;
            try {
                response = await this._request("GET", "/Orders/2.0/quick/user/positions");
            } catch (err) {
                if (err.response?.status === 404) {
                    response = await this._request("GET", "/quick/user/positions");
                } else {
                    throw err;
                }
            }

            const data = response.data;
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.data)) return data.data;
            return [];
        } catch (error) {
            console.error(
                "Kotak Neo Positions Error:",
                error.response?.data || error.message
            );
            throw new Error(
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Failed to fetch positions from Kotak Neo"
            );
        }
    }

    // --------------------------------------------------
    // ORDERS
    // --------------------------------------------------
    async getOrders() {
        try {
            let response;
            try {
                response = await this._request("GET", "/Orders/2.0/quick/user/orders");
            } catch (err) {
                if (err.response?.status === 404) {
                    response = await this._request("GET", "/quick/user/orders");
                } else {
                    throw err;
                }
            }

            const data = response.data;
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.data)) return data.data;
            return [];
        } catch (error) {
            console.error(
                "Kotak Neo Orders Error:",
                error.response?.data || error.message
            );
            throw new Error(
                error.response?.data?.message ||
                "Failed to fetch orders from Kotak Neo"
            );
        }
    }

    // --------------------------------------------------
    // LIMITS / VERIFY CREDENTIALS
    // --------------------------------------------------
    async getLimits() {
        let response;
        try {
            response = await this._request("GET", "/Orders/2.0/quick/user/limits");
        } catch (err) {
            if (err.response?.status === 404) {
                response = await this._request("GET", "/quick/user/limits");
            } else {
                throw err;
            }
        }
        return response.data;
    }
}

export default KotakNeoAdapter;
