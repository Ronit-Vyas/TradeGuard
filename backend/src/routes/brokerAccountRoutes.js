import express from "express";

import {
    createBrokerAccount,
    getBrokerAccounts,
    getBrokerAccount,
    updateBrokerAccount,
    deleteBrokerAccount,
} from "../controllers/brokerAccountController.js";

const router = express.Router();

router.post("/", createBrokerAccount);

router.get("/", getBrokerAccounts);

router.get("/:id", getBrokerAccount);

router.put("/:id", updateBrokerAccount);

router.delete("/:id", deleteBrokerAccount);

export default router;