import React, { useEffect, useRef } from 'react';
import { initPlayground, cleanupPlayground, updatePlaygroundSensors, morphTo } from '../pages/playground components/playgroundEngine';
import { startSentryLoop } from '../services/visionSentry';
import { sampleTextToPoints, sampleImageToPoints } from '../services/digitizer';

// src/components/Playground.jsx

const Playground = ({ onLoadingStage }) => {
    const videoRef = useRef(null);
    const stopSentryRef = useRef(null); // Store the stop function here

    useEffect(() => {
        // 1. ONLY Init 3D Engine on mount
        initPlayground('playground-canvas-container');


          const preventThreeFocus = (e) => {
        if (document.activeElement.tagName === 'INPUT') {
            e.stopPropagation();
        }
    };
    window.addEventListener('keydown', preventThreeFocus, true);




        // 2. Register the "Start Sensor" function globally
        window.activateCameraSensor = async () => {
            if (stopSentryRef.current) return; // Already running

            onLoadingStage(">>> INITIALIZING SENSORS...");
            
            // Start the loop only now
            stopSentryRef.current = await startSentryLoop(
                videoRef, 
                async (snap) => {
                    onLoadingStage(">>> DIGITIZING PIXELS...");
                    const data = await sampleImageToPoints(snap);
                    morphTo(data);
                    onLoadingStage(">>> SCAN COMPLETE");
                },
                (handData) => updatePlaygroundSensors(handData)
            );
        };

        window.executeTextMorph = (text) => {
            if (!text) return;
            const data = sampleTextToPoints(text); 
            morphTo(data);
        };

        // 3. CLEANUP
        return () => {
            if (stopSentryRef.current) stopSentryRef.current();
            cleanupPlayground();
            window.activateCameraSensor = null;
            window.executeTextMorph = null;

                 window.removeEventListener('keydown', preventThreeFocus, true);
        // ... cleanup ...
        };
    }, [onLoadingStage]);

    return (
        <div id="playground-canvas-container" style={{ position: 'fixed', inset: 0, zIndex: 1 }}>
            {/* Camera element exists but is idle until activateCameraSensor is called */}
            <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline muted />
        </div>
        
    );

    
};
export default Playground;