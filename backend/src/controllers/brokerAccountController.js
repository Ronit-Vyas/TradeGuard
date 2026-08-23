const mongoose = require("mongoose");
const BrokerAccount = require("../models/BrokerAccount");

// CREATE BROKER ACCOUNT
// POST /api/broker-accounts

const createBrokerAccount = async (req, res) => {
    try {
        const {
            userId,
            broker,
            credentials
        } = req.body;

        // Basic validation
        if (!userId || !broker || !credentials?.clientId) {
            return res.status(400).json({
                success: false,
                message: "userId, broker and clientId are required"
            });
        }

        // Check whether userId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid userId"
            });
        }

        // Check if this user already has this broker
        const existingAccount = await BrokerAccount.findOne({
            userId,
            broker
        });

        if (existingAccount) {
            return res.status(409).json({
                success: false,
                message: `User already has a ${broker} account`
            });
        }

        // Create broker account
        const brokerAccount = new BrokerAccount({
            userId,
            broker,
            credentials
        });

        // Save through Mongoose
        // This triggers pre("save")
        await brokerAccount.save();






        // DEBUG: check where Mongoose saved the document
        console.log("BrokerAccount collection:", BrokerAccount.collection.name);
        console.log("BrokerAccount database:", BrokerAccount.db.name);
        console.log(
            "BrokerAccount count:",
            await BrokerAccount.countDocuments()
        );
        



        // Don't send encrypted credentials back to frontend
        const response = brokerAccount.toObject();

        delete response.credentials.apiKey; // for not sending sensitive information to frontend
        delete response.credentials.apiSecret;
        delete response.credentials.accessToken;
        delete response.credentials.refreshToken;

        return res.status(201).json({
            success: true,
            message: "Broker account created successfully",
            data: response
        });

    } catch (error) {

        console.error("Create Broker Account Error:", error);

        return res.status(500).json({
            success: false,
            // message: "Failed to create broker account"
            message: error.message,
            error: error.name
        });
    }
};


// GET ALL BROKER ACCOUNTS
// GET /api/broker-accounts

const getBrokerAccounts = async (req, res) => {
    try {

        const { userId } = req.query;

        const filter = {};

        if (userId) {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid userId"
                });
            }

            filter.userId = userId;
        }

        const brokerAccounts = await BrokerAccount
            .find(filter)
            .select(
                "-credentials.apiKey " +
                "-credentials.apiSecret " +
                "-credentials.accessToken " +
                "-credentials.refreshToken"
            )
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: brokerAccounts.length,
            data: brokerAccounts
        });

    } catch (error) {

        console.error("Get Broker Accounts Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch broker accounts"
        });
    }
};


// GET ONE BROKER ACCOUNT
// GET /api/broker-accounts/:id

const getBrokerAccount = async (req, res) => {
    try {

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid broker account ID"
            });
        }

        const brokerAccount = await BrokerAccount
            .findById(id)
            .select(
                "-credentials.apiKey " +
                "-credentials.apiSecret " +
                "-credentials.accessToken " +
                "-credentials.refreshToken"
            );

        if (!brokerAccount) {
            return res.status(404).json({
                success: false,
                message: "Broker account not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: brokerAccount
        });

    } catch (error) {

        console.error("Get Broker Account Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch broker account"
        });
    }
};


// UPDATE BROKER ACCOUNT
// PUT /api/broker-accounts/:id

const updateBrokerAccount = async (req, res) => {
    try {

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid broker account ID"
            });
        }

        const brokerAccount = await BrokerAccount.findById(id);//Mongoose save middleware doesn't automatically behave the same way for findOneAndUpdate(). that's why we don't use findOneAndUpdate() 

        if (!brokerAccount) {
            return res.status(404).json({
                success: false,
                message: "Broker account not found"
            });
        }

        const {
            broker,
            credentials,
            isActive
        } = req.body;


        // Update broker
        if (broker) {
            brokerAccount.broker = broker;
        }


        // Update credentials
        if (credentials) {

            if (credentials.clientId !== undefined) {
                brokerAccount.credentials.clientId =
                    credentials.clientId;
            }

            if (credentials.apiKey !== undefined) {
                brokerAccount.credentials.apiKey =
                    credentials.apiKey;
            }

            if (credentials.apiSecret !== undefined) {
                brokerAccount.credentials.apiSecret =
                    credentials.apiSecret;
            }

            if (credentials.accessToken !== undefined) {
                brokerAccount.credentials.accessToken =
                    credentials.accessToken;
            }

            if (credentials.refreshToken !== undefined) {
                brokerAccount.credentials.refreshToken =
                    credentials.refreshToken;
            }

            if (credentials.tokenExpiresAt !== undefined) {
                brokerAccount.credentials.tokenExpiresAt =
                    credentials.tokenExpiresAt;
            }
        }


        // Update active status
        if (isActive !== undefined) {
            brokerAccount.isActive = isActive;
        }


        // IMPORTANT:
        // save() triggers our encryption middleware
        await brokerAccount.save();


        const response = brokerAccount.toObject();

        delete response.credentials.apiKey;
        delete response.credentials.apiSecret;
        delete response.credentials.accessToken;
        delete response.credentials.refreshToken;


        return res.status(200).json({
            success: true,
            message: "Broker account updated successfully",
            data: response
        });

    } catch (error) {

        console.error("Update Broker Account Error:", error);

        // Duplicate user + broker
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "User already has this broker account"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update broker account"
        });
    }
};


// DELETE BROKER ACCOUNT
// DELETE /api/broker-accounts/:id

const deleteBrokerAccount = async (req, res) => {
    try {

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid broker account ID"
            });
        }

        const brokerAccount =
            await BrokerAccount.findByIdAndDelete(id);

        if (!brokerAccount) {
            return res.status(404).json({
                success: false,
                message: "Broker account not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Broker account deleted successfully"
        });

    } catch (error) {

        console.error("Delete Broker Account Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete broker account"
        });
    }
};


module.exports = {
    createBrokerAccount,
    getBrokerAccounts,
    getBrokerAccount,
    updateBrokerAccount,
    deleteBrokerAccount
};