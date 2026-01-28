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

export async function sampleImageToPoints(imageSrc, pointCount = 6000) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageSrc;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 128; canvas.height = 128;
            ctx.drawImage(img, 0, 0, 128, 128);
            const data = ctx.getImageData(0, 0, 128, 128).data;
            const valid = [];
            for (let i = 0; i < data.length; i += 4) {
                if ((data[i]+data[i+1]+data[i+2])/3 > 40) {
                    const idx = i/4;
                    valid.push({ x: (idx%128)/128*10-5, y: -(Math.floor(idx/128))/128*10+5, z: (data[i]/255)*2-1, r: data[i]/255, g: data[i+1]/255, b: data[i+2]/255 });
                }
            }
            const pos = new Float32Array(pointCount*3);
            const col = new Float32Array(pointCount*3);
            for (let i = 0; i < pointCount; i++) {
                const p = valid[i % valid.length];
                pos[i*3] = p.x; pos[i*3+1] = p.y; pos[i*3+2] = p.z;
                col[i*3] = p.r; col[i*3+1] = p.g; col[i*3+2] = p.b;
            }
            resolve({ points: pos, colors: col });
        };
    });
}