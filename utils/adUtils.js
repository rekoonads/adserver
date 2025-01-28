export function generateAd(campaign, strategy) {
  return {
    title: `${campaign.campaignName} - ${strategy.strategyName}`,
    description: strategy.selectedGoal || "Check out our latest offer!",
    targetAudience: strategy.audiences.join(", "),
    channels: strategy.selectedChannels.join(", "),
    budget: `$${strategy.strategyDailyBudget} per day`,
    duration: `${campaign.startDate} to ${campaign.endDate}`,
    callToAction: "Learn More",
    location: campaign.audienceLocation || "All locations",
    ageRange: strategy.ageRange || "All ages",
    gender: strategy.gender || "All genders",
    screens: strategy.screens || "All screens",
  };
}

export function calculateBid(strategy) {
  if (strategy.biddingType === "automatic") {
    // Implement your automatic bidding logic here
    // This is a simplified example
    const baseBid = 1.0;
    const performanceMultiplier =
      (strategy.metrics.clicks / strategy.metrics.impressions) * 100;
    return baseBid * (1 + performanceMultiplier);
  } else {
    return strategy.currentBid;
  }
}
