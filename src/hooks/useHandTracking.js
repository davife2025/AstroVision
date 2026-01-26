// src/hooks/useHandTracking.js - FINAL FIX WITH CORRECT VIDEO ID

import { useState, useCallback } from 'react';
import { initHandTracking } from '../pages/space';

export const useHandTracking = () => {
  const [handTrackingEnabled, setHandTrackingEnabled] = useState(false);
  const [handStatus, setHandStatus] = useState({
    handCount: 0,
    scale: 1.0,
    expansion: 1.0
  });

  const toggleHandTracking = useCallback(async () => {
    if (!handTrackingEnabled) {
      console.log('🖐️ Attempting to enable hand tracking...');
      
      try {
        // ✅ CORRECT ID - Changed from 'webcam-video' to 'hand-video'
        const videoId = 'hand-video'; // Match your SpaceSimulation component
        
        // Check if video element exists first
        const videoElement = document.getElementById(videoId);
        
        if (!videoElement) {
          console.error('❌ Video element not found. Available video elements:');
          const allVideos = document.querySelectorAll('video');
          allVideos.forEach((v, i) => {
            console.log(`  Video ${i}: id="${v.id}", class="${v.className}"`);
          });
          return;
        }

        console.log('✅ Video element found:', videoElement);

        // Initialize hand tracking with correct STRING ID
        const success = await initHandTracking(videoId, (handData) => {
          setHandStatus(handData);
          console.log('👋 Hand data:', handData);
        });

        if (success) {
          setHandTrackingEnabled(true);
          console.log('✅ Hand tracking successfully enabled');
        } else {
          console.error('❌ Failed to initialize hand tracking');
        }
      } catch (error) {
        console.error('❌ Error enabling hand tracking:', error);
      }
    } else {
      // Disable hand tracking
      console.log('🛑 Disabling hand tracking');
      setHandTrackingEnabled(false);
      setHandStatus({ handCount: 0, scale: 1.0, expansion: 1.0 });
    }
  }, [handTrackingEnabled]);

  return {
    handTrackingEnabled,
    handStatus,
    toggleHandTracking,
  };
};