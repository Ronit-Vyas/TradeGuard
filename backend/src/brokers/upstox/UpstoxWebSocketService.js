import { createRequire } from "node:module";
import TradeRecord from "../../models/TradeRecord.js";
import UpstoxAdaptor from "./UpstoxAdaptor.js";
import { mapUpstoxOrder } from "./UpstoxMapper.js";
import BrokerAccount from "../../models/BrokerAccount.js";
import { decrypt } from "../../utils/encryption.js";

const require = createRequire(import.meta.url);
const UpstoxClient = require("upstox-js-sdk");

const connectUpstoxPortfolioStream = async ({
    brokerAccountId
}) => {

    if (!brokerAccountId) {
        throw new Error("brokerAccountId is required");
    }

    // 1. Fetch the broker account
    const brokerAccount =
        await BrokerAccount.findById(brokerAccountId);

    if (!brokerAccount) {
        throw new Error("Broker account not found");
    }

    if (brokerAccount.broker !== "UPSTOX") {
        throw new Error("This is not an Upstox account");
    }

    if (!brokerAccount.isActive) {
        throw new Error("Upstox account is inactive");
    }

    // 2. Decrypt the stored access token
    const encryptedToken =
        brokerAccount.credentials?.accessToken;

    if (!encryptedToken) {
        throw new Error("Upstox access token not found");
    }

    const accessToken = decrypt(encryptedToken);

    if (!accessToken) {
        throw new Error("Failed to decrypt access token");
    }

    const adaptor = new UpstoxAdaptor(accessToken);
    // 3. Configure SDK authentication
    const defaultClient =
        UpstoxClient.ApiClient.instance;

    const oauth =
        defaultClient.authentications["OAUTH2"];

    oauth.accessToken = accessToken;

    // 4. Create the Portfolio WebSocket streamer
    // Enable orders, positions, holdings and GTT updates
    const streamer =
        new UpstoxClient.PortfolioDataStreamer(
            true,  // order updates
            true,  // position updates
            true,  // holding updates
            true   // GTT updates
        );

    // 5. Register event listeners BEFORE connecting
    streamer.on("open", () => {
        console.log(
            "Upstox Portfolio WebSocket connected"
        );
    });

    streamer.on("message", async (data) => {
  try {
    console.log("🔥 UPSTOX LIVE EVENT RECEIVED:", data);
    const event =
      Buffer.isBuffer(data)
        ? JSON.parse(data.toString("utf8"))
        : typeof data === "string"
        ? JSON.parse(data)
        : data;

    console.log("UPSTOX EVENT:", event);

    // Extract the order ID from the WebSocket event.
    const orderId =
      event?.order_id ||
      event?.data?.order_id ||
      event?.payload?.order_id;

    if (!orderId) {
      console.log("No order ID in this event. Skipping.");
      return;
    }

    // 1. Fetch the latest order from Upstox REST API.
    const order = await adaptor.getOrderDetails(orderId);

    // 2. Map the Upstox order into your TradeGuard format.
    const mappedOrder = mapUpstoxOrder(order);

    // 3. Add the authenticated user's database references.
    const record = {
      ...mappedOrder,
      userId: brokerAccount.userId,
      brokerAccountId: brokerAccount._id,
      broker: "UPSTOX",
      orderId,
    };

    // 4. Update existing order record or insert a new one.
    await TradeRecord.updateOne(
      {
        brokerAccountId: brokerAccount._id,
        orderId,
      },
      {
        $set: record,
      },
      {
        upsert: true,
      }
    );

    console.log("TradeRecord updated for order:", orderId);
  } catch (error) {
    console.error(
      "WebSocket order sync failed:",
      error.response?.data || error.message
    );
  }
});

    streamer.on("error", (error) => {
        console.error(
            "Upstox WebSocket error:",
            error.message || error
        );
    });

    streamer.on("close", () => {
        console.log(
            "Upstox Portfolio WebSocket closed"
        );
    });

    streamer.on("reconnecting", () => {
        console.log(
            "Upstox WebSocket reconnecting..."
        );
    });

    streamer.on("autoReconnectStopped", (data) => {
        console.error(
            "Upstox auto-reconnect stopped:",
            data
        );
    });

    // 6. Enable reconnect handling
    streamer.autoReconnect(true, 10, 5);

    // 7. Connect
    streamer.connect();

    return streamer;
};

export {
    connectUpstoxPortfolioStream
};