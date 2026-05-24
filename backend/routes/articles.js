const express = require("express");
const axios = require("axios");

const router = express.Router();

// Keywords that must appear in title or description to pass as a health article
const HEALTH_KEYWORDS = [
  "health", "medical", "medicine", "disease", "treatment", "symptom",
  "doctor", "hospital", "patient", "wellness", "diet", "nutrition",
  "exercise", "mental", "vaccine", "drug", "therapy", "cancer",
  "diabetes", "heart", "virus", "surgery", "clinical", "pharma",
  "infection", "blood", "brain", "immune", "antibiotic", "prescription",
  "physician", "nurse", "pediatric", "chronic", "obesity", "stroke"
];

function isHealthArticle(article) {
  const text = `${article.title || ""} ${article.description || ""}`.toLowerCase();
  return HEALTH_KEYWORDS.some((k) => text.includes(k));
}

router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "health").trim();
    const isGenericHealth = q.toLowerCase() === "health";

    let rawArticles = [];

    // 1. Try top-headlines with category=health first — these are strictly health news
    if (isGenericHealth) {
      try {
        const topRes = await axios.get("https://newsapi.org/v2/top-headlines", {
          params: {
            category: "health",
            language: "en",
            pageSize: 15,
            apiKey: process.env.NEWS_API_KEY,
          },
        });
        rawArticles = topRes.data.articles || [];
      } catch (topErr) {
        console.warn("top-headlines health fallback:", topErr?.response?.data?.message || topErr.message);
      }
    }

    // 2. If top-headlines returned nothing or it's a specific search query,
    //    fall back to /everything but restrict matching to title+description only
    if (rawArticles.length < 5) {
      const searchQuery = isGenericHealth
        ? "health OR medicine OR medical OR wellness OR disease"
        : q;

      const evRes = await axios.get("https://newsapi.org/v2/everything", {
        params: {
          q: searchQuery,
          searchIn: "title,description", // match keyword only in title/description — NOT full text
          language: "en",
          sortBy: "publishedAt",
          pageSize: 20,
          apiKey: process.env.NEWS_API_KEY,
        },
      });
      rawArticles = evRes.data.articles || [];
    }

    // 3. Apply keyword filter as a final safety net to strip any non-health articles
    const safeArticles = rawArticles
      .filter((article) => article.title && article.url && isHealthArticle(article))
      .slice(0, 10)
      .map((article, index) => ({
        id: index + 1,
        title: article.title,
        subtitle: article.description || "No description available.",
        content:
          article.content ||
          article.description ||
          "No article content available.",
        image: article.urlToImage || "",
        url: article.url,
        source: article.source?.name || "Unknown source",
        publishedAt: article.publishedAt || null,
      }));

    res.json(safeArticles);
  } catch (error) {
    console.error(
      "GET /api/articles error:",
      error?.response?.data || error.message
    );
    res.status(500).json({ message: "Failed to load health articles." });
  }
});

module.exports = router;
