let lastFrameBuffer = null;
let stabilityScore = 0;
const STABILITY_THRESHOLD = 0.05; // 5% variance allowed

/**
 * Checks if the center of the camera feed is perfectly still
 */
export function checkVisualStability(videoElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 50; // Low-res for speed
    canvas.height = 50;
    
    // Draw center crop
    ctx.drawImage(videoElement, videoElement.videoWidth/4, videoElement.videoHeight/4, 
                  videoElement.videoWidth/2, videoElement.videoHeight/2, 0, 0, 50, 50);
    
    const currentFrame = ctx.getImageData(0, 0, 50, 50).data;

    if (lastFrameBuffer) {
        let diff = 0;
        for (let i = 0; i < currentFrame.length; i += 4) {
            diff += Math.abs(currentFrame[i] - lastFrameBuffer[i]);
        }
        
        const normalizedDiff = diff / (50 * 50 * 255);
        
        if (normalizedDiff < STABILITY_THRESHOLD) {
            stabilityScore++; // Image is still
        } else {
            stabilityScore = 0; // Image moved
        }
    }

    lastFrameBuffer = currentFrame;
    
    // Return true if image has been still for 45 frames (~1.5 seconds)
    return stabilityScore > 45;
}