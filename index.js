import express from "express";
import { generateAd } from "./utils/adUtils.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory storage to replace MongoDB
const campaigns = new Map();
const strategies = new Map();

// Mock data structure to simulate MongoDB documents
class Campaign {
  constructor(data) {
    this._id = data._id || Math.random().toString(36).substr(2, 9);
    this.campaignId = data.campaignId;
    this.name = data.name;
    this.budget = data.budget;
    this.status = data.status || 'active';
    this.createdAt = data.createdAt || new Date();
  }

  static findOne() {
    const campaignArray = Array.from(campaigns.values());
    if (campaignArray.length === 0) {
      // Create a default campaign if none exists
      const defaultCampaign = new Campaign({
        campaignId: 'default-campaign-1',
        name: 'Default Campaign',
        budget: 1000,
        status: 'active'
      });
      campaigns.set(defaultCampaign._id, defaultCampaign);
      return Promise.resolve(defaultCampaign);
    }
    // Sort by createdAt and return the latest
    const sorted = campaignArray.sort((a, b) => b.createdAt - a.createdAt);
    return Promise.resolve(sorted[0]);
  }
}

class Strategy {
  constructor(data) {
    this._id = data._id || Math.random().toString(36).substr(2, 9);
    this.strategyId = data.strategyId;
    this.campaignId = data.campaignId;
    this.name = data.name;
    this.currentBid = data.currentBid || 1.0;
    this.metrics = data.metrics || {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0
    };
    this.createdAt = data.createdAt || new Date();
  }

  static findOne(query) {
    const strategyArray = Array.from(strategies.values());
    if (strategyArray.length === 0 && query.campaignId) {
      // Create a default strategy if none exists
      const defaultStrategy = new Strategy({
        strategyId: 'default-strategy-1',
        campaignId: query.campaignId,
        name: 'Default Strategy',
        currentBid: 1.0
      });
      strategies.set(defaultStrategy._id, defaultStrategy);
      return Promise.resolve(defaultStrategy);
    }
    
    const filtered = strategyArray.filter(strategy => {
      return Object.keys(query).every(key => strategy[key] === query[key]);
    });
    
    if (filtered.length === 0) return Promise.resolve(null);
    
    // Sort by createdAt and return the latest
    const sorted = filtered.sort((a, b) => b.createdAt - a.createdAt);
    return Promise.resolve(sorted[0]);
  }

  static findByIdAndUpdate(id, update) {
    const strategy = strategies.get(id);
    if (!strategy) return Promise.resolve(null);

    if (update.$inc) {
      Object.keys(update.$inc).forEach(path => {
        const keys = path.split('.');
        let obj = strategy;
        for (let i = 0; i < keys.length - 1; i++) {
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] += update.$inc[path];
      });
    }

    strategies.set(id, strategy);
    return Promise.resolve(strategy);
  }

  static findOneAndUpdate(query, update, options = {}) {
    const strategyArray = Array.from(strategies.values());
    const strategy = strategyArray.find(s => {
      return Object.keys(query).every(key => s[key] === query[key]);
    });

    if (!strategy) return Promise.resolve(null);

    if (update.$inc) {
      Object.keys(update.$inc).forEach(path => {
        const keys = path.split('.');
        let obj = strategy;
        for (let i = 0; i < keys.length - 1; i++) {
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] += update.$inc[path];
      });
    }

    if (update.$set) {
      Object.keys(update.$set).forEach(key => {
        strategy[key] = update.$set[key];
      });
    }

    strategies.set(strategy._id, strategy);
    return Promise.resolve(options.new ? strategy : strategy);
  }

  static find(query) {
    const strategyArray = Array.from(strategies.values());
    const filtered = strategyArray.filter(strategy => {
      return Object.keys(query).every(key => strategy[key] === query[key]);
    });
    return Promise.resolve(filtered);
  }
}

console.log("Using in-memory storage (MongoDB replacement)");

// Serve an ad
app.get("/serve-ad", async (req, res) => {
  try {
    const campaign = await Campaign.findOne();
    const strategy = await Strategy.findOne({
      campaignId: campaign.campaignId,
    });

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
  process.exit(0);
});