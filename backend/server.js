const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
const Jimp = require('jimp');
const pixelmatch = require('pixelmatch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- 1. MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- 2. CONFIGURATION ---
const ASTROMETRY_API_KEY = process.env.ASTROMETRY_API_KEY || 'colziljqtejtgxxg';
const HF_API_KEY = process.env.HF_API_KEY; // FIXED: Removed REACT_APP_ prefix

// --- 3. SCIENTIFIC HELPERS ---

/**
 * Polls Astrometry.net for result calibration
 */
async function getCalibrationResults(subId) {
    const statusUrl = `http://nova.astrometry.net/api/submissions/${subId}`;
    for (let i = 0; i < 20; i++) {
        const response = await axios.get(statusUrl);
        if (response.data.job_calibrations && response.data.job_calibrations.length > 0) {
            const jobId = response.data.jobs[0];
            const calRes = await axios.get(`http://nova.astrometry.net/api/jobs/${jobId}/calibration/`);
            return calRes.data;
        }
        console.log(`🔭 Solving coordinates... Attempt ${i + 1}/20`);
        await new Promise(res => setTimeout(res, 3000));
    }
    throw new Error("Astrometry solving timed out.");
}

/**
 * Compares User Image with NASA Image using Pixelmatch
 */
async function performChangeDetection(userBuffer, nasaUrl) {
    try {
        const [userImg, nasaImg] = await Promise.all([
            Jimp.read(userBuffer),
            Jimp.read(nasaUrl)
        ]);

        userImg.resize(500, 500).greyscale();
        nasaImg.resize(500, 500).greyscale();

        const diffBuffer = Buffer.alloc(500, 500 * 4);
        const numDiffPixels = pixelmatch(
            userImg.bitmap.data,
            nasaImg.bitmap.data,
            diffBuffer,
            500, 500,
            { threshold: 0.15 }
        );
        return numDiffPixels;
    } catch (e) {
        console.error("Comparison Error:", e.message);
        return 0;
    }
}

// --- 4. API ROUTES ---

// A. Chat Route (AstroSage Reasoning)
// A. Chat Route (AstroSage Reasoning)
// A. Chat Route (AstroSage Reasoning)
app.post('/api/chat', async (req, res) => {
    console.log("🤖 Chat request received");
    const { prompt } = req.body;
    
    // MOCK RESPONSE if no API key
    if (!HF_API_KEY) {
        console.log("⚠️ No HF_API_KEY - using mock response");
        const mockText = `Mock response for: "${prompt}". To get real AI answers, add HF_API_KEY to your .env file. [TRIGGER:GALAXY]`;
        
        return res.json({
            choices: [{
                text: mockText,
                finish_reason: 'stop',
                index: 0
            }]
        });
    }
    
    // REAL AI RESPONSE with API key
    try {
        console.log("🤖 Calling real AstroSage AI...");
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/AstroMLab/AstroSage-8B',
            { 
                inputs: prompt, 
                parameters: { 
                    max_new_tokens: 300, 
                    return_full_text: false,
                    temperature: 0.7,
                    top_p: 0.9
                } 
            },
            { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
        );
        
        const text = Array.isArray(response.data) 
            ? response.data[0]?.generated_text 
            : response.data.generated_text;
        
        console.log("✅ Real AI response received");
        
        return res.json({
            choices: [{
                text: String(text || "No response").trim(),
                finish_reason: 'stop',
                index: 0
            }]
        });
    } catch (e) {
        console.error("❌ AI Error:", e.response?.data || e.message);
        
        // Fallback to mock if AI fails
        return res.json({
            choices: [{
                text: `AI service temporarily unavailable. Mock response for: "${prompt}" [TRIGGER:GALAXY]`,
                finish_reason: 'stop',
                index: 0
            }]
        });
    }
});

// B. Identify Route (VLM Vision ID)
app.post('/api/identify', async (req, res) => {
    console.log("👁️  Identification request received");
    
    // MOCK RESPONSE if no API key
    if (!HF_API_KEY) {
        console.log("⚠️  No HF_API_KEY - using mock vision response");
        return res.json({ 
            description: "A celestial object with bright stellar regions and dark dust lanes, showing characteristics of a spiral galaxy with prominent spiral arms."
        });
    }
    
    try {
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large',
            { inputs: req.body.image },
            { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
        );
        res.json({ description: response.data[0]?.generated_text || "Celestial structure" });
    } catch (e) {
        console.error("❌ Vision Error:", e.message);
        res.status(500).json({ error: "Vision ID failed: " + e.message });
    }
});

// C. Discovery Route (Astrometry + NASA + Pixelmatch)
app.post('/api/analyze-discovery', async (req, res) => {
    console.log("🚀 Starting Discovery Pipeline...");
    try {
        const { imageBase64 } = req.body;
        const imageBuffer = Buffer.from(imageBase64, 'base64');

        // 1. ASTROMETRY SOLVE
        const login = await axios.post(
            'http://nova.astrometry.net/api/login', 
            `request-json=${JSON.stringify({ "apikey": ASTROMETRY_API_KEY })}`
        );
        const session = login.data.session;
        
        const form = new FormData();
        form.append('request-json', JSON.stringify({ session, publicly_visible: 'n' }));
        form.append('file', imageBuffer, { filename: 'observation.jpg' });
        
        const upload = await axios.post(
            'http://nova.astrometry.net/api/upload', 
            form, 
            { headers: form.getHeaders() }
        );
        const calibration = await getCalibrationResults(upload.data.subid);
        
        // 2. NASA SKYVIEW FETCH
        const nasaUrl = `https://skyview.gsfc.nasa.gov/cgi-bin/images?survey=sdssi&position=${calibration.ra},${calibration.dec}&size=0.1&pixels=500`;
        console.log("🛰️  NASA Historical Image:", nasaUrl);

        // 3. PIXEL DIFFERENCE
        const diffCount = await performChangeDetection(imageBuffer, nasaUrl);
        const isAnomaly = diffCount > 1500;

        res.json({
            coords: { 
                ra: calibration.ra.toFixed(4), 
                dec: calibration.dec.toFixed(4) 
            },
            historicalImage: nasaUrl,
            discovery: isAnomaly 
                ? `ANOMALY: Found ${diffCount} pixel variances.` 
                : "Region stable.",
            type: isAnomaly ? "SUPERNOVA" : "GALAXY"
        });
        console.log("✅ Pipeline Complete");

    } catch (e) {
        console.error("❌ Discovery Pipeline Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// D. Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: '🌌 AstroVision Discovery Backend',
        version: '1.0.0',
        endpoints: {
            chat: 'POST /api/chat',
            identify: 'POST /api/identify',
            discovery: 'POST /api/analyze-discovery'
        },
        status: {
            hf_api_key: HF_API_KEY ? 'configured' : 'missing (using mocks)',
            astrometry_key: ASTROMETRY_API_KEY ? 'configured' : 'missing'
        }
    });
});

// --- 5. START SERVER ---
app.listen(PORT, () => {
    console.log(`\n🌌 AstroVision Backend running on http://localhost:${PORT}`);
    console.log(`🔑 HF API Key: ${HF_API_KEY ? '✓ Configured' : '✗ Missing (using mock responses)'}`);
    console.log(`🔭 Astrometry Key: ${ASTROMETRY_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`✅ Ready for Discovery, Vision, and Chat\n`);
});