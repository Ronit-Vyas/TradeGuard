const express = require("express");
const cors = require("cors");

const brokerAccountRoutes =
    require("./routes/brokerAccountRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "TradeGuard API is running"
    });
});

app.use(
    "/api/broker-accounts",
    brokerAccountRoutes
);

module.exports = app;