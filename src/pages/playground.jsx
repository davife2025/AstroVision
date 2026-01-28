import React, { useEffect, useRef } from 'react';
import { initPlayground, cleanupPlayground, updatePlaygroundSensors, morphTo } from './playground components/playgroundEngine';
import { startSentryLoop } from '../services/visionSentry';
import { sampleTextToPoints, sampleImageToPoints } from '../services/digitizer';

const Playground = ({ onLoadingStage }) => {
    const videoRef = useRef(null);
    const stopSentryRef = useRef(null);

    useEffect(() => {
        initPlayground('playground-canvas-container');

        window.executeTextMorph = (text) => {
            if (!text) return;
            morphTo(sampleTextToPoints(text));
        };

        window.loadImageToPlayground = async (uri) => {
            onLoadingStage(">>> DIGITIZING PIXELS...");
            const data = await sampleImageToPoints(uri);
            morphTo(data);
            onLoadingStage(">>> MANIFEST COMPLETE");
        };

        window.activateCameraSensor = async () => {
            if (stopSentryRef.current) return;
            onLoadingStage(">>> SENSORS ONLINE...");
            stopSentryRef.current = await startSentryLoop(
                videoRef, 
                async (snap) => {
                    onLoadingStage(">>> CAPTURED: DIGITIZING...");
                    morphTo(await sampleImageToPoints(snap));
                    onLoadingStage(">>> SCAN COMPLETE");
                },
                (handData) => updatePlaygroundSensors(handData)
            );
        };

        return () => {
            if (stopSentryRef.current) stopSentryRef.current();
            cleanupPlayground();
            window.executeTextMorph = null;
            window.activateCameraSensor = null;
            window.loadImageToPlayground = null;
        };
    }, [onLoadingStage]);

    return (
        <div id="playground-canvas-container" style={{ position: 'fixed', inset: 0, zIndex: 1 }}>
            <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline muted />
        </div>
    );
};

export default Playground;