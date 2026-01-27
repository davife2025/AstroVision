// src/services/digitizers.js
import * as THREE from 'three';

export function sampleTextToPoints(text, pointCount = 6000) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024; canvas.height = 256;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 120px Orbitron, sans-serif'; // High-tech font
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), 512, 128);

    const imageData = ctx.getImageData(0, 0, 1024, 256).data;
    const pixels = [];
    // Sample every 4th pixel for speed
    for (let y = 0; y < 256; y += 4) {
        for (let x = 0; x < 1024; x += 4) {
            if (imageData[(y * 1024 + x) * 4] > 128) {
                pixels.push({ x: (x - 512) * 0.02, y: (128 - y) * 0.02 });
            }
        }
    }

    const posArray = new Float32Array(pointCount * 3);
    const colArray = new Float32Array(pointCount * 3);

    for (let i = 0; i < pointCount; i++) {
        const p = pixels.length > 0 ? pixels[i % pixels.length] : { x: 0, y: 0 };
        const i3 = i * 3;
        posArray[i3] = p.x;
        posArray[i3 + 1] = p.y;
        posArray[i3 + 2] = (Math.random() - 0.5) * 0.5; // Depth
        
        // Text Color: Neon Cyan
        colArray[i3] = 0; colArray[i3+1] = 1; colArray[i3+2] = 1;
    }

    return { points: posArray, colors: colArray };
}