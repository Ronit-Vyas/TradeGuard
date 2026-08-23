const express = require("express");

const {
    createBrokerAccount,
    getBrokerAccounts,
    getBrokerAccount,
    updateBrokerAccount,
    deleteBrokerAccount
} = require("../controllers/brokerAccountController");

const router = express.Router();

router.post(
    "/",
    createBrokerAccount
);

router.get(
    "/",
    getBrokerAccounts
);

router.get(
    "/:id",
    getBrokerAccount
);

router.put(
    "/:id",
    updateBrokerAccount
);

router.delete(
    "/:id",
    deleteBrokerAccount
);

module.exports = router;