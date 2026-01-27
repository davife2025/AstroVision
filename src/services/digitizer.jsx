import * as THREE from 'three';

/**
 * Turns Text into a 3D target map
 */
export function sampleTextToPoints(text, pointCount = 6000) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 256;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 140px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const pixels = [];
    for (let y = 0; y < canvas.height; y += 4) {
        for (let x = 0; x < canvas.width; x += 4) {
            const index = (y * canvas.width + x) * 4;
            if (imageData[index] > 128) {
                pixels.push({
                    x: (x - canvas.width / 2) * 0.015,
                    y: (canvas.height / 2 - y) * 0.015
                });
            }
        }
    }

    const pts = [];
    const colors = [];
    for (let i = 0; i < pointCount; i++) {
        const p = pixels.length > 0 ? pixels[i % pixels.length] : { x: 0, y: 0 };
        pts.push(new THREE.Vector3(p.x, p.y, (Math.random() - 0.5) * 0.5));
        colors.push(0, 1, 1); // Cyan for text
    }
    return { points: new Float32Array(pts.flatMap(v => [v.x, v.y, v.z])), colors: new Float32Array(colors) };
}

/**
 * Turns an Image into a 3D target map
 */
export async function sampleImageToPoints(imageSrc, pointCount = 6000) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageSrc;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 128;
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, size, size);
            
            const data = ctx.getImageData(0, 0, size, size).data;
            const candidates = [];
            for (let i = 0; i < data.length; i += 4) {
                const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
                if (brightness > 30) {
                    const idx = i / 4;
                    candidates.push({
                        x: (idx % size) / size * 10 - 5,
                        y: -(Math.floor(idx / size)) / size * 10 + 5,
                        z: (brightness / 255) * 2,
                        r: data[i]/255, g: data[i+1]/255, b: data[i+2]/255
                    });
                }
            }

            const pts = [];
            const colors = [];
            for (let i = 0; i < pointCount; i++) {
                const c = candidates.length > 0 ? candidates[i % candidates.length] : {x:0,y:0,z:0,r:0,g:1,b:1};
                pts.push(c.x, c.y, c.z);
                colors.push(c.r, c.g, c.b);
            }
            resolve({ points: new Float32Array(pts), colors: new Float32Array(colors) });
        };
    });
}