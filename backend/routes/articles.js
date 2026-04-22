const express = require("express");
const axios = require("axios");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "health").trim();

    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q,
        language: "en",
        sortBy: "publishedAt",
        pageSize: 10,
        apiKey: process.env.NEWS_API_KEY,
      },
    });

    const safeArticles = (response.data.articles || [])
      .filter((article) => article.title && article.url)
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
    console.error("GET /api/articles error:", error?.response?.data || error.message);
    res.status(500).json({ message: "Failed to load health articles." });
  }
});

module.exports = router;