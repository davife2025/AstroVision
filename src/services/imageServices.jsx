// src/services/imageServices.js

import { MAX_IMAGE_WIDTH, IMAGE_QUALITY } from '../utils/constants';

/**
 * Convert file to base64 string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Compress image before upload
 */
export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(MAX_IMAGE_WIDTH / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY).split(',')[1]);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Create preview URL from file
 */
export const createPreviewURL = (file) => {
  return URL.createObjectURL(file);
};

/**
 * Validate image file
 */
export const validateImageFile = (file) => {
  if (!file) return { valid: false, error: 'No file selected' };
  
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Please upload a valid image file (JPEG, PNG, WEBP)' };
  }
  
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Image size must be less than 10MB' };
  }
  
  return { valid: true };
};