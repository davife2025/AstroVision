// src/services/visionSentry.js

let lastFrameBuffer = null;
let stabilityScore = 0;



/**
 * HELPER: Captures the current video frame as a high-res Base64 string
 */
function captureHighRes(videoElement) {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9); // High quality for the digitizer
}

/**
 * HELPER: Stability check logic
 */
function checkVisualStability(videoElement) {
    if (!videoElement) return false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 50; canvas.height = 50;
    ctx.drawImage(videoElement, 0, 0, 50, 50);
    const currentFrame = ctx.getImageData(0, 0, 50, 50).data;

    let isStable = false;
    if (lastFrameBuffer) {
        let diff = 0;
        for (let i = 0; i < currentFrame.length; i += 4) {
            diff += Math.abs(currentFrame[i] - lastFrameBuffer[i]);
        }
        const normalizedDiff = diff / (50 * 50 * 255);
        if (normalizedDiff < 0.05) stabilityScore++;
        else stabilityScore = 0;
        
        if (stabilityScore > 40) isStable = true;
    }
    lastFrameBuffer = currentFrame;
    return isStable;
}

/**
 * THE MAIN EXPORT
 */export async function startSentryLoop(videoRef, onScanTrigger, onHandUpdate) {
    // 1. Check if the device has a camera first
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasWebcam = devices.some(device => device.kind === 'videoinput');

    if (!hasWebcam) {
        console.error("No webcam found on this device.");
        return () => {}; // Return empty cleanup
    }

    const { Hands } = await import('@mediapipe/hands');
    const { Camera } = await import('@mediapipe/camera_utils');

    const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
    });

// Inside visionSentry.js -> hands.onResults
hands.onResults((results) => {
    const handData = window.processHandLandmarks(results);
    onHandUpdate(handData);

    // Check if manual trigger was pressed OR if the image is stable
    const isManualTriggered = window.forceSensorSnap === true;
    const isAutoStable = !handData.isPresent && checkVisualStability(videoRef.current);

    if (isManualTriggered || isAutoStable) {
        const snap = captureHighRes(videoRef.current);
        onScanTrigger(snap);
        
        // IMPORTANT: Reset the manual flag
        window.forceSensorSnap = false;
        stabilityScore = -100; // Reset auto-timer
    }
});

    const camera = new Camera(videoRef.current, {
        onFrame: async () => {
            if (videoRef.current) await hands.send({ image: videoRef.current });
        },
        width: 1280,
        height: 720
    });

    try {
        await camera.start();
    } catch (err) {
        console.warn("Could not start camera. It might be in use by another tab.");
    }

    return () => {
        camera.stop();
        hands.close();
    };
}