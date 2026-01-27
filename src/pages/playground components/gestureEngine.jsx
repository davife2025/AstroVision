/**
 * Processes MediaPipe results into a standardized HandData object
 */
export function processHandLandmarks(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        return { isPresent: false };
    }

    const landmarks = results.multiHandLandmarks[0];
    
    // 1. POINTING: Use Index Fingertip (Landmark 8)
    const indexTip = landmarks[8];
    // Map 0-1 range to Three.js -5 to 5 range
    const handX = (indexTip.x - 0.5) * 10;
    const handY = -(indexTip.y - 0.5) * 10;

    // 2. Z-PROXIMITY: Calculate "Depth" based on Palm Size
    // Distance between wrist (0) and middle finger base (9)
    const palmSize = Math.hypot(
        landmarks[0].x - landmarks[9].x,
        landmarks[0].y - landmarks[9].y
    );
    // Larger palm = hand is closer to camera = stronger magnetic force
    const zProximity = Math.min(Math.max(palmSize * 10, 0.5), 3.0);

    // 3. TENSION: Distance between two hands (if both present)
    let tension = 1.0;
    if (results.multiHandLandmarks.length === 2) {
        const h1 = results.multiHandLandmarks[0][0]; // Palm 1
        const h2 = results.multiHandLandmarks[1][0]; // Palm 2
        tension = Math.hypot(h1.x - h2.x, h1.y - h2.y) * 5;
    }

    return {
        isPresent: true,
        x: handX,
        y: handY,
        zProximity: zProximity,
        tension: tension
    };
}