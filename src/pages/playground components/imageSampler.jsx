/**
 * Transforms an image into a 3D target map using luminosity for Z-depth.
 */
export async function sampleImageToPoints(imageSrc, pointCount = 6000) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageSrc;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 128; // Sample resolution
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, size, size);
            
            const data = ctx.getImageData(0, 0, size, size).data;
            const candidates = [];

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i] / 255;
                const g = data[i+1] / 255;
                const b = data[i+2] / 255;
                const brightness = (r + g + b) / 3;

                if (brightness > 0.1) { // Filter out dark "empty space"
                    const idx = i / 4;
                    const x = (idx % size) / size * 10 - 5;
                    const y = -(Math.floor(idx / size)) / size * 10 + 5;
                    
                    // BRIGHTNESS TO Z-DEPTH (Correction: Brighter = Closer)
                    const z = brightness * 2.0 - 1.0; 

                    candidates.push({ x, y, z, r, g, b });
                }
            }

            const targetPoints = [];
            const targetColors = [];
            for (let i = 0; i < pointCount; i++) {
                const c = candidates[i % candidates.length];
                targetPoints.push(c.x, c.y, c.z);
                targetColors.push(c.r, c.g, c.b);
            }

            resolve({ points: new Float32Array(targetPoints), colors: new Float32Array(targetColors) });
        };
    });
}