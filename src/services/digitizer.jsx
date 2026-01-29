export function sampleTextToPoints(text, pointCount = 6000) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024; canvas.height = 256;
    ctx.fillStyle = 'black'; ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = 'white'; ctx.font = 'bold 130px Orbitron';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), 512, 128);

    const data = ctx.getImageData(0, 0, 1024, 256).data;
    const pixels = [];
    for (let y = 0; y < 256; y += 4) {
        for (let x = 0; x < 1024; x += 4) {
            if (data[(y * 1024 + x) * 4] > 128) pixels.push({ x: (x - 512) * 0.02, y: (128 - y) * 0.02 });
        }
    }

    const pos = new Float32Array(pointCount * 3);
    const col = new Float32Array(pointCount * 3);
    for (let i = 0; i < pointCount; i++) {
        const p = pixels.length > 0 ? pixels[i % pixels.length] : { x: 0, y: 0 };
        pos[i*3] = p.x; pos[i*3+1] = p.y; pos[i*3+2] = (Math.random()-0.5)*0.5;
        col[i*3] = 0; col[i*3+1] = 1; col[i*3+2] = 1;
    }
    return { points: pos, colors: col };
}

// src/services/digitizer.js

export async function sampleImageToPoints(imageSrc, pointCount = 6000) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageSrc;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = 128;
            canvas.width = size; canvas.height = size;
            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;
            
            const valid = [];
            for (let i = 0; i < data.length; i += 4) {
                const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
                if (brightness > 30) { 
                    const idx = i / 4;
                    valid.push({ 
                        // SHRUNK COORDINATES: From 10 to 6 units wide
                        x: (idx % size) / size * 6 - 3, 
                        y: -(Math.floor(idx / size)) / size * 6 + 3, 
                        // DAMPENED DEPTH: Reduced from 2.0 to 0.5
                        z: (brightness / 255) * 0.5 - 0.25, 
                        r: data[i]/255, 
                        g: data[i+1]/255, 
                        b: data[i+2]/255 
                    });
                }
            }

            if (valid.length === 0) {
                for(let k=0; k<100; k++) {
                    valid.push({ x: (Math.random()-0.5)*4, y: (Math.random()-0.5)*4, z: 0, r: 0, g: 1, b: 1 });
                }
            }

            const pos = new Float32Array(pointCount * 3);
            const col = new Float32Array(pointCount * 3);
            for (let i = 0; i < pointCount; i++) {
                const p = valid[i % valid.length];
                const i3 = i * 3;
                pos[i3] = p.x; pos[i3+1] = p.y; pos[i3+2] = p.z;
                col[i3] = p.r; col[i3+1] = p.g; col[i3+2] = p.b;
            }
            resolve({ points: pos, colors: col });
        };
    });
}