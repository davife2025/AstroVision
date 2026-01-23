// src/hooks/useSpaceSimulation.js

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  initThree, 
  createParticles, 
  changeColor, 
  cleanup,
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
      setTimeout(() => {
        initThree('space-canvas-container');
        threeInitialized.current = true;
        threeReady.current = true;
      }, 100);
    }

    return () => {
      if (!isActive && threeInitialized.current) {
        cleanup();
        threeInitialized.current = false;
        threeReady.current = false;
      }
    };
  }, [isActive]);

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

    return () => clearInterval(autoScanInterval);
  }, [isActive, handTrackingEnabled, onAutoScan]);

  const handleAutoScan = useCallback((base64) => {
    if (isProcessingScan.current) return;

    // Clear previous timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Debounce by configured delay
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

  const changeShape = useCallback((shape) => {
    if (!threeReady.current) return;
    setSelectedShape(shape);
    createParticles(shape);
  }, []);

  const updateColor = useCallback((color) => {
    if (!threeReady.current) return;
    setParticleColor(color);
    changeColor(color);
  }, []);

  const updateSimulationFromAI = useCallback((aiText, type) => {
    if (!threeReady.current) return;

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