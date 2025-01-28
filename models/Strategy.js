import { model, Schema } from "mongoose";

const strategySchema = new Schema(
  {
    userId: { type: String },
    strategyId: { type: String },
    agencyId: { type: String },
    strategyName: { type: String },
    strategyDailyBudget: { type: String },
    selectedGoal: { type: String },
    selectedOption: { type: String },
    selectedChannels: [{ type: String }],
    ageRange: { type: String },
    gender: { type: String },
    screens: { type: String },
    audiences: [{ type: String }],
    deliveryTimeSlots: { type: Object },
    creatives: { type: String },
    audienceLocation: { type: String },
    targetedIPs: [{ type: String }],
    deliveryType: { type: String },
    duration: { type: Number },
    campaignId: { type: String },
    // New fields for bidding
    currentBid: { type: Number, default: 0 },
    biddingType: {
      type: String,
      enum: ["automatic", "manual"],
      default: "manual",
    },
    metrics: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      spend: { type: Number, default: 0 },
    },
    targetMetrics: {
      ctr: { type: Number, default: 2.0 },
      conversionRate: { type: Number, default: 5.0 },
      roas: { type: Number, default: 2.0 },
    },
  },
  {
    timestamps: true,
  }
);

const Strategy = model("strategies", strategySchema);

export default Strategy;
