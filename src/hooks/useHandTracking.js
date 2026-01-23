// src/hooks/useHandTracking.js

import { useState, useCallback } from 'react';

export const useHandTracking = () => {
  const [handTrackingEnabled, setHandTrackingEnabled] = useState(false);
  const [handStatus, setHandStatus] = useState({ 
    handCount: 0, 
    scale: 1, 
    expansion: 1 
  });

  const toggleHandTracking = useCallback(async (videoElementId = 'hand-video') => {
    if (!handTrackingEnabled) {
      // Check if space.js functions are available
      if (typeof window.initHandTracking === 'function') {
        const success = await window.initHandTracking(videoElementId, setHandStatus);
        setHandTrackingEnabled(success);
        return success;
      } else {
        console.error('initHandTracking not found. Make sure space.js is loaded.');
        return false;
      }
    } else {
      // Stop tracking
      if (typeof window.stopHandTracking === 'function') {
        window.stopHandTracking();
      }
      setHandTrackingEnabled(false);
      setHandStatus({ handCount: 0, scale: 1, expansion: 1 });
      return false;
    }
  }, [handTrackingEnabled]);

  const startTracking = useCallback(async (videoElementId = 'hand-video') => {
    if (!handTrackingEnabled) {
      if (typeof window.initHandTracking === 'function') {
        const success = await window.initHandTracking(videoElementId, setHandStatus);
        setHandTrackingEnabled(success);
        return success;
      }
      return false;
    }
    return true;
  }, [handTrackingEnabled]);

  const stopTracking = useCallback(() => {
    if (handTrackingEnabled) {
      if (typeof window.stopHandTracking === 'function') {
        window.stopHandTracking();
      }
      setHandTrackingEnabled(false);
      setHandStatus({ handCount: 0, scale: 1, expansion: 1 });
    }
  }, [handTrackingEnabled]);

  return {
    handTrackingEnabled,
    handStatus,
    toggleHandTracking,
    startTracking,
    stopTracking,
  };
};

export default useHandTracking;