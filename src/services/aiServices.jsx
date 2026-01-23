// src/services/aiService.js

import { API_ENDPOINTS, ERROR_MESSAGES } from '../utils/constants';
import { retryFetch, parseAIResponse } from '../utils/helpers';

/**
 * Identify astronomical object using vision model
 */
export const identifyWithLlava = async (base64) => {
  const fetchFn = async () => {
    const res = await fetch(`${API_ENDPOINTS.BACKEND}/api/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 }),
    });

    if (res.status === 503) throw new Error(ERROR_MESSAGES.VISION_OFFLINE);
    if (!res.ok) throw new Error('Vision analysis failed');
    
    const data = await res.json();
    return data.description || 'Celestial structure detected.';
  };

  return retryFetch(fetchFn);
};

/**
 * Analyze discovery with scientific backend
 */
export const solveAndCompare = async (base64) => {
  // Add /api/ to match the new server route
  const res = await fetch(`${API_ENDPOINTS.BACKEND}/api/analyze-discovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64 }),
  });

  if (!res.ok) throw new Error('Scientific discovery failed');
  return await res.json();
};
/**
 * Get AI response using AstroSage model
 */
export const getAstroSageResponse = async (prompt, maxTokens = 500) => {
  console.log('Calling API:', `${API_ENDPOINTS.BACKEND}/api/chat`); // Debug log
  
  const res = await fetch(`${API_ENDPOINTS.BACKEND}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      maxTokens,
      temperature: 0.7,
      topP: 0.9,
    }),
  });

  if (!res.ok) {
    console.error('API Error:', res.status, res.statusText);
    throw new Error('AI chat failed');
  }
  
  const data = await res.json();
  console.log('📦 Raw API response:', data);
  console.log('📦 Raw API response (stringified):', JSON.stringify(data, null, 2));
  
  const parsed = parseAIResponse(data, 'I am analyzing your query.');
  console.log('✅ Parsed response:', parsed);
  
  return parsed;
};

/**
 * Run complete discovery pipeline
 */
export const runDiscoveryAnalysis = async (base64, userQuestion, onProgress) => {
  // Step 1: Visual identification
  if (onProgress) onProgress('Analyzing image...');
  const visualId = await identifyWithLlava(base64);

  // Step 2: Scientific comparison
  if (onProgress) onProgress('Comparing with database...');
  const discoveryData = await solveAndCompare(base64);

  // Step 3: AI reasoning
  if (onProgress) onProgress('Generating insights...');
  const astroPrompt = `[Visual: ${visualId}] [Coords: RA ${discoveryData.coords.ra}] [Change: ${discoveryData.discovery}] Question: ${userQuestion}.
Summarize findings and trigger template: [TRIGGER:${discoveryData.type}]`;

  const aiText = await getAstroSageResponse(astroPrompt);

  return {
    visualId,
    discoveryData,
    aiText,
  };
};

/**
 * Pure chat without image
 */
export const chatWithAstroSage = async (text) => {
  return await getAstroSageResponse(text, 300);
};