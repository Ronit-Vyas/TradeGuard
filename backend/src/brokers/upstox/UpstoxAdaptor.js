const axios = require("axios");

class UpstoxAdapter {

    constructor(accessToken) {
        if (!accessToken) {
            throw new Error("Upstox access token is required");
        }

        this.accessToken = accessToken;

        this.baseURL = "https://api.upstox.com/v2";

        // Create a reusable Axios instance.
        // This prevents us from repeating the same headers
        // for every Upstox API request.
        this.client = axios.create({
            baseURL: this.baseURL,

            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Bearer ${this.accessToken}`
            }
        });
    }


    /**
     * Get details of a specific order.
     *
     * Upstox endpoint:
     * GET /order/details?order_id=<orderId>
     *
     * This is useful when we already know an order ID
     * and want its latest status/details.
     */
    async getOrderDetails(orderId) {

        if (!orderId) {
            throw new Error("Order ID is required");
        }

        try {

            const response = await this.client.get(
                "/order/details",
                {
                    params: {
                        order_id: orderId
                    }
                }
            );

            // Return only the actual data object.
            // The adapter handles Upstox's API structure,
            // so the rest of our application doesn't need
            // to know about response.data.data.
            return response.data.data;

        } catch (error) {

            // Extract useful information from Upstox's error response.
            const brokerError =
                error.response?.data ||
                error.message;

            console.error(
                "Upstox getOrderDetails error:",
                brokerError
            );

            throw new Error(
                `Upstox order details request failed: ${
                    error.response?.data?.errors?.[0]?.message ||
                    error.message
                }`
            );
        }
    }


    /**
     * Get all trades executed for the current day.
     *
     * This is the method we will primarily use for
     * Trade Guard's trade synchronization.
     *
     * Upstox endpoint:
     * GET /order/trades/get-trades-for-day
     */
    async getTradesForDay() {

        try {

            const response = await this.client.get(
                "/order/trades/get-trades-for-day"
            );

            return response.data.data || [];

        } catch (error) {

            const brokerError =
                error.response?.data ||
                error.message;

            console.error(
                "Upstox getTradesForDay error:",
                brokerError
            );

            throw new Error(
                `Upstox trade synchronization failed: ${
                    error.response?.data?.errors?.[0]?.message ||
                    error.message
                }`
            );
        }
    }
}


module.exports = UpstoxAdapter;