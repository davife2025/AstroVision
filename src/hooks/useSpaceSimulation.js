// src/hooks/useSpaceSimulation.js - FIXED VERSION

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  initThree, 
  createParticles, 
  changeColor, 
  cleanupThree,  // ✅ Changed from 'cleanup' to 'cleanupThree'
  checkAutoScan
} from '../pages/space';
import { PARTICLE_SHAPES, DISCOVERY_TYPES, AUTO_SCAN_INTERVAL, DEBOUNCE_DELAY } from '../utils/constants';

export const useSpaceSimulation = (isActive, handTrackingEnabled, onAutoScan) => {
  const [selectedShape, setSelectedShape] = useState('heart');
  const [particleColor, setParticleColor] = useState('#00ffcc');
  
  const threeInitialized = useRef(false);
  const threeReady = useRef(false);
  const isProcessingScan = useRef(false);
  const debounceTimeout = useRef(null);

  // Initialize Three.js when simulation becomes active
  useEffect(() => {
    if (isActive && !threeInitialized.current) {
      console.log('🎨 Initializing Three.js...');
      
      setTimeout(() => {
        try {
          initThree('space-canvas-container');
          threeInitialized.current = true;
          threeReady.current = true;
          console.log('✅ Three.js initialized');
        } catch (error) {
          console.error('❌ Three.js initialization error:', error);
        }
      }, 100);
    }

    return () => {
      if (!isActive && threeInitialized.current) {
        console.log('🧹 Cleaning up Three.js...');
        cleanupThree(); // ✅ Using cleanupThree
        threeInitialized.current = false;
        threeReady.current = false;
      }
    };
  }, [isActive]);

  const handleAutoScan = useCallback((base64) => {
    if (isProcessingScan.current) return;

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      isProcessingScan.current = true;
      try {
        await onAutoScan(base64);
      } catch (e) {
        console.error('Auto-scan error:', e);
      } finally {
        isProcessingScan.current = false;
      }
    }, DEBOUNCE_DELAY);
  }, [onAutoScan]);

  // Auto-scan functionality
  useEffect(() => {
    if (!isActive || !handTrackingEnabled || !threeReady.current || !onAutoScan) {
      return;
    }

    const autoScanInterval = setInterval(() => {
      if (!isProcessingScan.current) {
        checkAutoScan((capturedBase64) => {
          handleAutoScan(capturedBase64);
        });
      }
    }, AUTO_SCAN_INTERVAL);

    return () => {
      clearInterval(autoScanInterval);
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [isActive, handTrackingEnabled, onAutoScan, handleAutoScan]);

  const changeShape = useCallback((shape) => {
    if (!threeReady.current) {
      console.warn('⚠️ Three.js not ready, cannot change shape');
      return;
    }
    
    console.log('🔄 Changing shape to:', shape);
    setSelectedShape(shape);
    createParticles(shape);
  }, []);

  const updateColor = useCallback((color) => {
    if (!threeReady.current) {
      console.warn('⚠️ Three.js not ready, cannot change color');
      return;
    }
    
    console.log('🎨 Changing color to:', color);
    setParticleColor(color);
    changeColor(color);
  }, []);

  const updateSimulationFromAI = useCallback((aiText, type) => {
    if (!threeReady.current) {
      console.warn('⚠️ Three.js not ready, cannot update from AI');
      return;
    }

    console.log('🤖 AI triggered update:', type);

    if (aiText.includes('[TRIGGER:GALAXY]') || type === DISCOVERY_TYPES.GALAXY) {
      changeShape('galaxy');
    }
    if (aiText.includes('[TRIGGER:SATURN]') || type === DISCOVERY_TYPES.SATURN) {
      changeShape('saturn');
    }
    if (aiText.includes('[TRIGGER:FIREWORKS]') || type === DISCOVERY_TYPES.SUPERNOVA) {
      changeShape('fireworks');
      updateColor('#ff3366');
    }
  }, [changeShape, updateColor]);

  return {
    selectedShape,
    particleColor,
    changeShape,
    updateColor,
    updateSimulationFromAI,
    threeReady: threeReady.current,
    shapes: PARTICLE_SHAPES,
  };
};