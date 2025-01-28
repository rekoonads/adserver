import express from "express";
import mongoose from "mongoose";
import { generateAd } from "./utils/adUtils.js";

// Import models

import Campaign from "./models/Campaign.js";
import Strategy from "./models/Strategy.js";

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/adserver";

app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Serve an ad
app.get("/serve-ad", async (req, res) => {
  try {
    const campaign = await Campaign.findOne().sort({ createdAt: -1 });
    const strategy = await Strategy.findOne({
      campaignId: campaign.campaignId,
    }).sort({ createdAt: -1 });

    if (!campaign || !strategy) {
      return res.status(404).json({ error: "No campaign or strategy found" });
    }

    const ad = generateAd(campaign, strategy);

    // Update impression count
    await Strategy.findByIdAndUpdate(strategy._id, {
      $inc: { "metrics.impressions": 1 },
    });

    res.json({
      ad,
      campaignId: campaign.campaignId,
      strategyId: strategy.strategyId,
    });
  } catch (error) {
    console.error("Error serving ad:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Record ad click
app.post("/record-click", async (req, res) => {
  const { campaignId, strategyId } = req.body;

  if (!campaignId || !strategyId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await Strategy.findOneAndUpdate(
      { strategyId: strategyId },
      { $inc: { "metrics.clicks": 1 } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error recording click:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update bid (for manual bidding)
app.post("/update-bid", async (req, res) => {
  const { strategyId, newBid } = req.body;

  if (!strategyId || newBid === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const strategy = await Strategy.findOneAndUpdate(
      { strategyId: strategyId },
      { $set: { currentBid: newBid } },
      { new: true }
    );

    if (!strategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }

    res.json({ success: true, updatedBid: strategy.currentBid });
  } catch (error) {
    console.error("Error updating bid:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get campaign performance
app.get("/campaign-performance/:campaignId", async (req, res) => {
  const { campaignId } = req.params;

  try {
    const strategies = await Strategy.find({ campaignId: campaignId });

    if (strategies.length === 0) {
      return res
        .status(404)
        .json({ error: "No strategies found for this campaign" });
    }

    const performance = strategies.reduce(
      (acc, strategy) => {
        acc.impressions += strategy.metrics.impressions;
        acc.clicks += strategy.metrics.clicks;
        acc.conversions += strategy.metrics.conversions;
        acc.spend += strategy.metrics.spend;
        return acc;
      },
      { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
    );

    performance.ctr = (performance.clicks / performance.impressions) * 100 || 0;
    performance.conversionRate =
      (performance.conversions / performance.clicks) * 100 || 0;

    res.json(performance);
  } catch (error) {
    console.error("Error fetching campaign performance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Ad server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  mongoose.connection.close(false, () => {
    console.log("MongoDB connection closed");
    process.exit(0);
  });
});
