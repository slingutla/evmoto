import Parser from "rss-parser";

const QUERIES = {
  ev: "electric vehicles when:7d",
  moto: "motorcycle news when:7d"
};
const parser = new Parser();

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }
  const topic = req.query?.topic;
  if (typeof topic !== "string" || !Object.hasOwn(QUERIES, topic)) {
    return res.status(400).json({ message: "Invalid article topic." });
  }
  try {
    const url = new URL("https://news.google.com/rss/search");
    url.search = new URLSearchParams({ q: QUERIES[topic], hl: "en-US", gl: "US", ceid: "US:en" });
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Feed unavailable");
    const feed = await parser.parseString(await response.text());
    const articles = feed.items.filter((item) => {
      try {
        return item.title && new URL(item.link).protocol === "https:";
      } catch {
        return false;
      }
    }).slice(0, 6).map((item) => ({
      title: item.title,
      url: item.link,
      publishedAt: Number.isFinite(Date.parse(item.isoDate || item.pubDate))
        ? new Date(item.isoDate || item.pubDate).toISOString() : null
    }));
    if (!articles.length) throw new Error("No articles");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600");
    return res.status(200).json({ articles, updatedAt: new Date().toISOString() });
  } catch {
    return res.status(502).json({ message: "Unable to refresh articles. Please try again later." });
  }
}
