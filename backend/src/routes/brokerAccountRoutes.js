import express from "express";

import {
    createBrokerAccount,
    getBrokerAccounts,
    getBrokerAccount,
    updateBrokerAccount,
    deleteBrokerAccount,
    syncBrokerTrades,
} from "../controllers/brokerAccountController.js";

const router = express.Router();

router.post("/", createBrokerAccount);

router.get("/", getBrokerAccounts);

router.get("/:id", getBrokerAccount);

router.put("/:id", updateBrokerAccount);

router.delete("/:id", deleteBrokerAccount);

router.post("/:id/sync", syncBrokerTrades);

export default router;