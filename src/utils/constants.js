// src/utils/constants.js

// Debug: Log environment variable
console.log('REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);

export const API_ENDPOINTS = {
  BACKEND: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001',
  HF_ROUTER: 'https://router.huggingface.co/featherless-ai/v1/completions',
  HF_VISION: 'https://api-inference.huggingface.co/models/llava-hf/llava-1.5-7b-hf',
};

// Debug: Log the final API_ENDPOINTS
console.log('API_ENDPOINTS:', API_ENDPOINTS);

export const AI_MODELS = {
  ASTRO_SAGE: 'AstroMLab/AstroSage-8B',
  LLAVA: 'llava-hf/llava-1.5-7b-hf',
};

export const PARTICLE_SHAPES = ['galaxy', 'saturn', 'fireworks', 'buddha', 'heart'];

export const DISCOVERY_TYPES = {
  GALAXY: 'GALAXY',
  SATURN: 'SATURN',
  SUPERNOVA: 'SUPERNOVA',
  UNKNOWN: 'UNKNOWN',
};

export const AUTO_SCAN_INTERVAL = 500; // milliseconds
export const DEBOUNCE_DELAY = 2000; // milliseconds
export const MAX_IMAGE_WIDTH = 800;
export const IMAGE_QUALITY = 0.8;
export const MAX_RETRIES = 3;

export const ERROR_MESSAGES = {
  NO_INPUT: 'Please upload an image or enter a question.',
  MODEL_LOADING: 'AI model is loading... please try again in 30 seconds.',
  VISION_OFFLINE: 'Vision model is waking up...',
  BACKEND_OFFLINE: 'Scientific Backend offline.',
  GENERIC: 'An error occurred. Please try again.',
};