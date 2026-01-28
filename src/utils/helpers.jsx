// src/utils/helpers.js - FIXED VERSION

/**
 * Parse AI response from various formats
 * Handles responses from Hugging Face completions API
 */
export const parseAIResponse = (data, fallback = 'No response generated.') => {
  console.log('📥 Parsing AI response:', data);

  try {
    // Format 1: Direct response field (our mock format)
    if (data.response) {
      return data.response;
    }

    // Format 2: Hugging Face completions format - choices array
    if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      console.log('🔍 Inspecting choices[0]:', data.choices[0]);
      
      const choice = data.choices[0];
      
      // Debug: Check what properties exist
      console.log('🔑 Choice keys:', Object.keys(choice));
      console.log('📝 choice.text value:', choice.text);
      console.log('📝 choice.text type:', typeof choice.text);
      
      // Try different possible locations for the text
      if (choice.text) {
        console.log('✅ Found choice.text, returning:', choice.text);
        return choice.text.trim();
      }
      if (choice.message && choice.message.content) {
        console.log('✅ Found choice.message.content');
        return choice.message.content.trim();
      }
      if (choice.message && typeof choice.message === 'string') {
        console.log('✅ Found choice.message as string');
        return choice.message.trim();
      }
      if (choice.generated_text) {
        console.log('✅ Found choice.generated_text');
        return choice.generated_text.trim();
      }
      if (typeof choice === 'string') {
        console.log('✅ Choice is string');
        return choice.trim();
      }
      
      console.warn('⚠️ Found choices array but no text in expected fields:', choice);
    }

    // Format 3: Single choice object
    if (data.choice && data.choice.text) {
      return data.choice.text.trim();
    }

    // Format 4: Direct text field
    if (data.text) {
      return data.text.trim();
    }

    // Format 5: Generated text (vision models)
    if (data.generated_text) {
      return data.generated_text.trim();
    }

    // Format 6: Message content
    if (data.message && data.message.content) {
      return data.message.content.trim();
    }

    console.warn('⚠️ Unexpected response format:', data);
    return fallback;

  } catch (error) {
    console.error('❌ Parse error:', error);
    return fallback;
  }
};


/**
 * Retry a fetch operation with exponential backoff
 */
export const retryFetch = async (fetchFn, maxRetries = 3, initialDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on 4xx errors (client errors)
      if (error.message.includes('400') || 
          error.message.includes('401') || 
          error.message.includes('403') ||
          error.message.includes('404')) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Extract trigger commands from AI text
 * Example: "[TRIGGER:GALAXY]" -> "GALAXY"
 */
export const extractTrigger = (text) => {
  if (!text) return null;
  
  const match = text.match(/\[TRIGGER:(\w+)\]/i);
  return match ? match[1].toUpperCase() : null;
};

/**
 * Format coordinates for display
 */
export const formatCoordinates = (coords) => {
  if (!coords) return 'Unknown';
  
  const { ra, dec } = coords;
  return `RA: ${ra || 'N/A'}, Dec: ${dec || 'N/A'}`;
};

/**
 * Validate base64 image string
 */
export const isValidBase64Image = (str) => {
  if (!str || typeof str !== 'string') return false;
  
  // Check if it's already a data URL
  if (str.startsWith('data:image/')) return true;
  
  // Check if it's valid base64
  try {
    return btoa(atob(str)) === str;
  } catch {
    return false;
  }
};

/**
 * Truncate text to specified length
 */
export const truncate = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Debounce function
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Format timestamp for display
 */
export const formatTimestamp = (date) => {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Safe JSON parse with fallback
 */
export const safeJsonParse = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};


window.processHandLandmarks = (results) => {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    return { isPresent: false, handCount: 0 };
  }
  const landmarks = results.multiHandLandmarks[0];
  const indexTip = landmarks[8];
  const palmBase = landmarks[0];
  const middleBase = landmarks[9];
  const palmSize = Math.hypot(palmBase.x - middleBase.x, palmBase.y - middleBase.y);

  return {
    isPresent: true,
    handCount: results.multiHandLandmarks.length,
    x: (indexTip.x - 0.5) * 10,
    y: -(indexTip.y - 0.5) * 10,
    zProximity: Math.min(Math.max(palmSize * 15, 0.5), 3.0),
    scale: palmSize * 20
  };
};

/**
 * Clean AI response text
 * Removes extra whitespace and formatting artifacts
 */
export const cleanAIResponse = (text) => {
  if (!text) return '';
  
  return text
    .trim()
    .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
    .replace(/\s{2,}/g, ' ')    // Remove excessive spaces
    .replace(/^\s+|\s+$/gm, '') // Trim each line
    .trim();
};
