import BrokerAccount from "../../models/BrokerAccount.js";
import { startUpstoxStream } from "./UpstoxConnectionManager.js";

export async function reconnectUpstoxAccounts() {
  const accounts = await BrokerAccount.find({
    broker: "UPSTOX",
    isActive: true,
  });

  for (const account of accounts) {
    try {
      await startUpstoxStream(account._id);

      console.log(
        "Upstox stream started for account:",
        account._id
      );
    } catch (error) {
      console.error(
        "Failed to reconnect account:",
        account._id,
        error.message
      );
    }
  }
}