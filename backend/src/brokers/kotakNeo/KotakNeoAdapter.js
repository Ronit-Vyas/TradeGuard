import axios from "axios";
import { generateTOTP, extractSecretFromInput } from "../../utils/totp.js";

/**
 * KotakNeoAdapter
 * Comprehensive integration adapter for Kotak Neo Trade API (v2 and v3).
 * Supports automatic TOTP authentication (MPIN + TOTP), session management,
 * multi-datacenter failover, positions, trades, orders, and market quotes.
 */
class KotakNeoAdapter {
    constructor({
        accessToken = "",
        sid = "",
        consumerKey = "",
        consumerSecret = "",
        baseUrl = "",
        mobileNumber = "",
        ucc = "",
        mpin = "",
        totpSecret = ""
    } = {}) {
        let tokenStr = String(accessToken || "").trim();
        let sidStr = String(sid || "").trim();

        // Helper to detect token types
        const looksLikeJwt = (str) =>
            typeof str === "string" &&
            (str.startsWith("eyJ") || (str.split(".").length === 3 && str.length > 50));

        const looksLikeUuid = (str) =>
            typeof str === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

        // Smart correction: If accessToken is a UUID and sid is a JWT, swap them
        if (looksLikeUuid(tokenStr) && looksLikeJwt(sidStr)) {
            const temp = tokenStr;
            tokenStr = sidStr;
            sidStr = temp;
        } else if (looksLikeUuid(tokenStr) && !sidStr) {
            // User provided Session ID (UUID) in the Access Token field
            sidStr = tokenStr;
            tokenStr = "";
        }

        this.accessToken = tokenStr;
        this.sid = sidStr;
        this.consumerKey = consumerKey ? String(consumerKey).trim() : "";
        this.consumerSecret = consumerSecret ? String(consumerSecret).trim() : "";
        this.mobileNumber = mobileNumber ? String(mobileNumber).trim() : "";
        this.ucc = ucc ? String(ucc).trim() : "";
        this.mpin = mpin ? String(mpin).trim() : "";
        this.totpSecret = totpSecret ? extractSecretFromInput(totpSecret) : "";

        // Base domain: Official production domain is https://mis.kotaksecurities.com
        this.baseURL = baseUrl ? String(baseUrl).trim().replace(/\/+$/, "") : "https://mis.kotaksecurities.com";

        this.serverClusters = [
            this.baseURL,
            "https://mis.kotaksecurities.com",
            "https://e21.kotaksecurities.com",
            "https://e41.kotaksecurities.com",
            "https://gw-napi.kotaksecurities.com",
            "https://cis.kotaksecurities.com"
        ];
        // Deduplicate servers
        this.serverClusters = [...new Set(this.serverClusters.filter(Boolean))];
    }

    /**
     * Builds standard headers required by Kotak Neo Trade API endpoints
     */
    _buildHeaders(extraHeaders = {}) {
        const headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "neo-fin-key": "neotradeapi",
            ...extraHeaders
        };

        // Kotak Neo requires "Auth" header containing the trade JWT token
        if (this.accessToken) {
            headers["Auth"] = this.accessToken;
            headers["Authorization"] = `Bearer ${this.accessToken}`;
        }

        // Only send Sid if it's a valid session ID (avoid sending 500-char JWT in Sid)
        if (this.sid && !this.sid.startsWith("eyJ")) {
            headers["Sid"] = this.sid;
        }

        if (this.consumerKey) {
            headers["consumerKey"] = this.consumerKey;
            headers["X-Client-ID"] = this.consumerKey.slice(0, 8) + "***";
        }

        return headers;
    }

    /**
     * Executes HTTP requests with datacenter fallback and endpoint alternate path support
     */
    async _request(method, path, options = {}) {
        const pathsToTry = Array.isArray(path) ? path : [path];
        let lastError;

        for (const currentPath of pathsToTry) {
            for (const serverUrl of this.serverClusters) {
                try {
                    const headers = this._buildHeaders(options.headers || {});
                    const client = axios.create({
                        baseURL: serverUrl,
                        timeout: 10000,
                        headers
                    });

                    const response = await client.request({
                        method,
                        url: currentPath,
                        ...options
                    });

                    // Check for Kotak Neo internal error responses
                    const data = response?.data;
                    if (data && typeof data === "object") {
                        if (data.stCode === 200002 || data.stat === "request format error") {
                            // Format error on this cluster or path, try next
                            lastError = new Error(data.errMsg || "Kotak Neo request format error (200002)");
                            lastError.response = response;
                            continue;
                        }
                    }

                    return response;
                } catch (error) {
                    lastError = error;

                    // If token expired or unauthorized, check if we can auto-login via TOTP
                    const isAuthError =
                        error.response?.status === 401 ||
                        error.response?.status === 403 ||
                        error.response?.data?.stCode === 100022 ||
                        error.response?.data?.errMsg?.toLowerCase().includes("session") ||
                        error.response?.data?.errMsg?.toLowerCase().includes("unauthorized") ||
                        error.response?.data?.errMsg?.toLowerCase().includes("token expired");

                    if (isAuthError) {
                        // Attempt automatic re-login if credentials are configured
                        if (this.canAutoLogin()) {
                            try {
                                console.log("[Kotak Neo] Session expired, re-authenticating via TOTP...");
                                await this.loginWithTotp();
                                // Retry request with fresh tokens
                                return await this._request(method, currentPath, options);
                            } catch (loginErr) {
                                console.error("[Kotak Neo] Auto-login re-authentication failed:", loginErr.message);
                            }
                        }
                        throw error;
                    }

                    // Retry other servers only on network errors or 5xx
                    if (error.response && error.response.status >= 400 && error.response.status < 500) {
                        // Non-auth 4xx, try next path if available
                        break;
                    }
                }
            }
        }

        throw lastError;
    }

    /**
     * Determines if automatic TOTP login can be performed
     */
    /**
     * Builds the Basic Authorization header value for login endpoints.
     * Kotak Neo requires: "Basic base64(consumerKey:consumerSecret)"
     * Falls back to raw consumerKey if no secret is present (legacy/single-key apps).
     */
    _buildLoginAuth(overrideKey = "", overrideSecret = "") {
        const key = overrideKey || this.consumerKey;
        const secret = overrideSecret || this.consumerSecret;
        if (key && secret) {
            const encoded = Buffer.from(`${key}:${secret}`).toString("base64");
            return `Basic ${encoded}`;
        }
        // Fallback: some older app registrations may work with just the key
        return key;
    }

    canAutoLogin() {
        return !!(
            this.consumerKey &&
            (this.ucc || this.mobileNumber) &&
            this.mpin &&
            this.totpSecret
        );
    }

    /**
     * Authenticates with Kotak Neo using TOTP flow:
     * 1. POST /login/1.0/tradeApiLogin (mobileNumber/ucc + totp) -> view token + sid
     * 2. POST /login/1.0/tradeApiValidate (mpin) -> trade access token (JWT) + session sid + baseUrl
     */
    async loginWithTotp({ mobileNumber, ucc, mpin, totpSecret, totp, consumerKey, consumerSecret } = {}) {
        const mob = String(mobileNumber || this.mobileNumber || "").trim();
        const clientUcc = String(ucc || this.ucc || "").trim();
        const pin = String(mpin || this.mpin || "").trim();
        const secret = extractSecretFromInput(totpSecret || this.totpSecret);
        const cKey = String(consumerKey || this.consumerKey || "").trim();
        const cSecret = String(consumerSecret || this.consumerSecret || "").trim();

        if (!cKey) {
            throw new Error("Consumer Key is required for Kotak Neo TOTP login");
        }

        if (!clientUcc && !mob) {
            throw new Error("UCC (Client ID) or Mobile Number is required for Kotak Neo login");
        }

        if (!pin) {
            throw new Error("Trading MPIN is required for Kotak Neo login");
        }

        let computedTotp = String(totp || "").trim();
        if (!computedTotp && secret) {
            computedTotp = generateTOTP(secret);
        }

        if (!computedTotp || computedTotp.length !== 6) {
            throw new Error("Valid 6-digit TOTP code or TOTP secret key is required");
        }

        // Build Authorization header: Basic base64(consumerKey:consumerSecret)
        const authHeader = this._buildLoginAuth(cKey, cSecret);

        // STEP 1: tradeApiLogin
        const loginUrl = "https://mis.kotaksecurities.com/login/1.0/tradeApiLogin";
        const loginHeaders = {
            "Authorization": authHeader,
            "neo-fin-key": "neotradeapi",
            "Content-Type": "application/json"
        };
        const loginBody = {
            mobileNumber: mob || "",
            ucc: clientUcc || "",
            totp: computedTotp
        };

        const loginRes = await axios.post(loginUrl, loginBody, { headers: loginHeaders, timeout: 10000 });
        const loginData = loginRes?.data?.data;

        if (!loginData || !loginData.token) {
            const errMsg = loginRes?.data?.errMsg || loginRes?.data?.message || "Kotak Neo TOTP login step 1 failed";
            throw new Error(errMsg);
        }

        const viewToken = loginData.token;
        const initialSid = loginData.sid;

        // STEP 2: tradeApiValidate
        const validateUrl = "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate";
        const validateHeaders = {
            "Authorization": authHeader,
            "sid": initialSid,
            "Auth": viewToken,
            "neo-fin-key": "neotradeapi",
            "Content-Type": "application/json"
        };
        const validateBody = {
            mpin: pin
        };

        const validateRes = await axios.post(validateUrl, validateBody, { headers: validateHeaders, timeout: 10000 });
        const validateData = validateRes?.data?.data;

        if (!validateData || !validateData.token) {
            const errMsg = validateRes?.data?.errMsg || validateRes?.data?.message || "Kotak Neo MPIN validation step 2 failed";
            throw new Error(errMsg);
        }

        // Update adapter session state with trade tokens
        this.accessToken = validateData.token;
        this.sid = validateData.sid || initialSid;
        if (validateData.baseUrl) {
            this.baseURL = String(validateData.baseUrl).replace(/\/+$/, "");
            if (!this.serverClusters.includes(this.baseURL)) {
                this.serverClusters.unshift(this.baseURL);
            }
        }
        if (clientUcc) this.ucc = clientUcc;
        if (mob) this.mobileNumber = mob;
        if (pin) this.mpin = pin;
        if (secret) this.totpSecret = secret;
        if (cKey) this.consumerKey = cKey;
        if (cSecret) this.consumerSecret = cSecret;

        return {
            accessToken: this.accessToken,
            sid: this.sid,
            baseUrl: this.baseURL,
            serverId: validateData.hsServerId || "",
            dataCenter: validateData.dataCenter || "",
            ucc: validateData.ucc || clientUcc
        };
    }

    // --------------------------------------------------
    // POSITIONS
    // Endpoints: /quick/user/positions, /Orders/2.0/quick/user/positions
    // --------------------------------------------------
    async getPositions() {
        try {
            if (!this.accessToken && this.canAutoLogin()) {
                await this.loginWithTotp();
            }

            if (!this.accessToken) {
                // If only Session ID exists without JWT token
                throw new Error(
                    "Kotak Neo Trade Access Token is missing. " +
                    "Please update your Kotak Neo Access Token (starts with eyJ...) and Session ID (sid), " +
                    "or enter your Trading MPIN and TOTP Secret for automatic login."
                );
            }

            const response = await this._request(
                "GET",
                ["/quick/user/positions", "/Orders/2.0/quick/user/positions"]
            );

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
            const data = error.response?.data;
            if (data?.stCode === 200002) {
                throw new Error(
                    "Kotak Neo request format error (200002): Invalid or expired authentication format. " +
                    "Please verify that your Access Token is a valid JWT (starts with eyJ...) and Session ID is a valid UUID, " +
                    "or configure your Trading MPIN and TOTP Secret for automatic login."
                );
            }
            const errMsg = data?.errMsg || data?.message || error.message || "Failed to fetch positions";
            throw new Error(`Failed to fetch positions from Kotak Neo: ${errMsg}`);
        }
    }

    // --------------------------------------------------
    // TRADES
    // Endpoints: /quick/user/trades, /Orders/2.0/quick/user/trades
    // --------------------------------------------------
    async getTrades(orderId = "") {
        try {
            if (!this.accessToken && this.canAutoLogin()) {
                await this.loginWithTotp();
            }

            const params = {};
            if (orderId) {
                params.order_id = orderId;
            }

            let response;
            try {
                response = await this._request(
                    "GET",
                    ["/quick/user/trades", "/Orders/2.0/quick/user/trades"],
                    { params }
                );
            } catch (err) {
                // Check if session token expired or unauthorized
                const isAuthError =
                    err.response?.status === 401 ||
                    err.response?.status === 403 ||
                    err.response?.data?.stCode === 100022 ||
                    err.response?.data?.errMsg?.toLowerCase().includes("session") ||
                    err.response?.data?.errMsg?.toLowerCase().includes("unauthorized") ||
                    err.response?.data?.errMsg?.toLowerCase().includes("invalid token");

                if (isAuthError) {
                    throw new Error(
                        "Kotak Neo session has expired or token is invalid. " +
                        "Please update your Access Token and Session ID (sid) in Broker Accounts, " +
                        "or provide your Trading MPIN and TOTP Secret for automatic renewal."
                    );
                }

                // Fallback to reading executed orders from order book
                try {
                    response = await this._request(
                        "GET",
                        ["/quick/user/orders", "/Orders/2.0/quick/user/orders"],
                        { params }
                    );
                } catch {
                    throw err;
                }
            }

            const data = response?.data;
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.data)) return data.data;
            if (data?.stat === "Ok" && Array.isArray(data?.result)) return data.result;
            return [];
        } catch (error) {
            console.error(
                "Kotak Neo Trades Error:",
                error.response?.data || error.message
            );
            const errMsg =
                error.response?.data?.errMsg ||
                error.response?.data?.message ||
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

    async getTradesForDay() {
        return this.getTrades();
    }

    // --------------------------------------------------
    // ORDERS
    // Endpoints: /quick/user/orders, /Orders/2.0/quick/user/orders
    // --------------------------------------------------
    async getOrders() {
        try {
            if (!this.accessToken && this.canAutoLogin()) {
                await this.loginWithTotp();
            }

            const response = await this._request(
                "GET",
                ["/quick/user/orders", "/Orders/2.0/quick/user/orders"]
            );
            const data = response?.data;
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.data)) return data.data;
            if (data?.stat === "Ok" && Array.isArray(data?.result)) return data.result;
            return [];
        } catch (error) {
            console.error("Kotak Neo Orders Error:", error.response?.data || error.message);
            return [];
        }
    }

    // --------------------------------------------------
    // HOLDINGS
    // Endpoints: /portfolio/v1/holdings, /Portfolio/1.0/portfolio/v1/holdings
    // --------------------------------------------------
    async getHoldings() {
        try {
            if (!this.accessToken && this.canAutoLogin()) {
                await this.loginWithTotp();
            }

            const response = await this._request(
                "GET",
                ["/portfolio/v1/holdings", "/Portfolio/1.0/portfolio/v1/holdings"],
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Accept": "*/*"
                    }
                }
            );
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
    // Endpoints: /quick/user/limits, /Orders/2.0/quick/user/limits
    // --------------------------------------------------
    async getLimits() {
        try {
            if (!this.accessToken && this.canAutoLogin()) {
                await this.loginWithTotp();
            }

            const response = await this._request(
                "GET",
                ["/quick/user/limits", "/Orders/2.0/quick/user/limits"]
            );
            return response?.data;
        } catch (error) {
            console.error("Kotak Neo Limits Error:", error.response?.data || error.message);
            return null;
        }
    }

    // --------------------------------------------------
    // MARKET DATA: QUOTES
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
    // MARKET DATA: HISTORICAL CANDLES
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
