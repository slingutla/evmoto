const RECOMMENDATIONS = {
  headphones: [
    { name: "QuietWave Pro", price: 299, tags: ["noise canceling", "travel"] },
    { name: "StudioAir Lite", price: 149, tags: ["lightweight", "gym"] },
    { name: "BassDrive X", price: 99, tags: ["bass", "value"] }
  ],
  laptop: [
    { name: "NovaBook 14", price: 899, tags: ["portable", "battery"] },
    { name: "RenderMax 16", price: 1499, tags: ["performance", "creator"] },
    { name: "BudgetMate 13", price: 649, tags: ["value", "student"] }
  ],
  "running-shoes": [
    { name: "CloudSprint 2", price: 140, tags: ["lightweight", "race"] },
    { name: "TrailForge", price: 160, tags: ["trail", "stability"] },
    { name: "DailyStride", price: 110, tags: ["cushion", "daily"] }
  ]
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { category, budget, preference } = req.body || {};
  if (!category || !budget || !preference) {
    return res.status(400).json({ message: "Missing input" });
  }

  const options = RECOMMENDATIONS[category] || [];
  if (!options.length) {
    return res.status(404).json({ message: "Category not found" });
  }

  const pref = String(preference).toLowerCase();
  const scored = options
    .map((item) => {
      let score = 0;
      if (item.price <= budget) score += 2;
      if (item.tags.some((t) => pref.includes(t) || t.includes(pref))) score += 2;
      score -= Math.abs(item.price - budget) / 100;
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  return res.status(200).json({
    recommendation: `${best.name} ($${best.price}) - tuned for "${preference}" with budget $${budget}.`
  });
}
