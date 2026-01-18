const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // ✅ FIX
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());


const HF_API_KEY = process.env.HF_API_KEY;

/* ---------- IMAGE ANALYSIS ---------- */
app.post("/analyze-image", async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    const hfRes = await fetch(
      "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: imageBase64 }),
      }
    );

    const data = await hfRes.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log("🚀 Backend running on http://localhost:3001");
});

console.log("Analyze image endpoint hit");
