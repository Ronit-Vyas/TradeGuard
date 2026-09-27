import BrokerAccount from "../../models/BrokerAccount.js";
import { connectUpstoxPortfolioStream } from "./UpstoxWebSocketService.js";

const activeStreams = new Map();

export async function startUpstoxStream(brokerAccountId) {
  const id = brokerAccountId.toString();

  // Don't create duplicate connections
  if (activeStreams.has(id)) {
    return activeStreams.get(id);
  }

  const brokerAccount = await BrokerAccount.findById(id);

  if (!brokerAccount || !brokerAccount.isActive) {
    throw new Error("Active Upstox account not found");
  }

  const stream = await connectUpstoxPortfolioStream({
    brokerAccountId: id,
  });

  activeStreams.set(id, stream);

  console.log("Upstox stream started for account:", id);
  return stream;
}

export async function stopUpstoxStream(brokerAccountId) {
  const id = brokerAccountId.toString();

  const stream = activeStreams.get(id);

  if (!stream) return;

  stream.disconnect();

  activeStreams.delete(id);
}