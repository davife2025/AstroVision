import * as THREE from 'three';
import { gsap } from 'gsap';

let scene, camera, renderer, particles, geometry, material;
let animationId;
let hands, videoElement, cameraInstance;

// Auto-Scan Stability Variables
let lastFrameData = null;
let stabilityCounter = 0;
const STABILITY_THRESHOLD = 5000; // Sensitivity for movement detection
const REQUIRED_STABILITY_FRAMES = 40; // ~1.5 seconds of stillness

const params = {
    color: '#00ffcc',
    template: 'sphere',
    particleSize: 0.05,
    expansion: 1.0,
    scale: 1.0,
    pointCount: 6000 // Keep point count consistent for smooth morphing
};

export function initThree(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    createParticles(params.template);
    animate();

    return { scene, camera, renderer };
}

/**
 * NEW: Fluid Morphing Logic
 * Instead of removing particles, we animate the positions of existing points
 * to their new target locations.
 */
export function createParticles(template) {
    const targetPoints = generatePoints(template);

    if (!particles) {
        // First time initialization
        geometry = new THREE.BufferGeometry().setFromPoints(targetPoints);
        material = new THREE.PointsMaterial({
            color: params.color,
            size: params.particleSize,
            transparent: true,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        particles = new THREE.Points(geometry, material);
        scene.add(particles);
    } else {
        // Morphing Transition
        const currentPositions = geometry.attributes.position.array;
        
        targetPoints.forEach((pt, i) => {
            const index = i * 3;
            // Animate x, y, z individually using GSAP
            gsap.to(currentPositions, {
                [index]: pt.x,
                [index + 1]: pt.y,
                [index + 2]: pt.z,
                duration: 2.5,
                ease: "expo.inOut",
                onUpdate: () => {
                    geometry.attributes.position.needsUpdate = true;
                }
            });
        });
    }
    params.template = template;
}

export function generatePoints(type) {
    const pts = [];
    const count = params.pointCount;
    
    for (let i = 0; i < count; i++) {
        let x, y, z = 0;
        
        if (type === 'heart') {
            const t = Math.random() * Math.PI * 2;
            x = 16 * Math.pow(Math.sin(t), 3);
            y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            pts.push(new THREE.Vector3(x * 0.15, y * 0.15, (Math.random() - 0.5) * 0.5));
        } else if (type === 'flower') {
            const t = Math.random() * Math.PI * 2;
            const r = 3 * Math.cos(5 * t);
            x = r * Math.cos(t);
            y = r * Math.sin(t);
            pts.push(new THREE.Vector3(x, y, (Math.random() - 0.5) * 0.2));
        } else if (type === 'saturn') {
            const isRing = Math.random() > 0.4;
            if (isRing) {
                const r = 2.5 + Math.random() * 1.5;
                const t = Math.random() * Math.PI * 2;
                pts.push(new THREE.Vector3(r * Math.cos(t), (Math.random() - 0.5) * 0.1, r * Math.sin(t)));
            } else {
                const phi = Math.random() * Math.PI * 2;
                const theta = Math.random() * Math.PI;
                const r = 1.5;
                pts.push(new THREE.Vector3(r * Math.sin(theta) * Math.cos(phi), r * Math.sin(theta) * Math.sin(phi), r * Math.cos(theta)));
            }
        } else if (type === 'buddha') {
            const layer = Math.random();
            if (layer > 0.7) {
                const phi = Math.random() * Math.PI * 2;
                const theta = Math.random() * Math.PI;
                const r = 0.6;
                pts.push(new THREE.Vector3(r * Math.sin(theta) * Math.cos(phi), r * Math.sin(theta) * Math.sin(phi) + 1.6, r * Math.cos(theta)));
            } else {
                const h = Math.random() * 2.5;
                const r = (2.5 - h) * 0.9;
                const theta = Math.random() * Math.PI * 2;
                pts.push(new THREE.Vector3(r * Math.cos(theta), h - 0.8, r * Math.sin(theta)));
            }
        } else if (type === 'fireworks') {
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const r = Math.pow(Math.random(), 0.5) * 4;
            pts.push(new THREE.Vector3(r * Math.sin(theta) * Math.cos(phi), r * Math.sin(theta) * Math.sin(phi), r * Math.cos(theta)));
        } else if (type === 'galaxy') {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 4;
            const armOffset = Math.floor(Math.random() * 3) * (Math.PI * 2 / 3);
            x = radius * Math.cos(angle + armOffset + radius * 0.6);
            z = radius * Math.sin(angle + armOffset + radius * 0.6);
            y = (Math.random() - 0.5) * (1.0 / (radius + 0.5));
            pts.push(new THREE.Vector3(x, y, z));
        } else {
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const r = 2.5;
            pts.push(new THREE.Vector3(r * Math.sin(theta) * Math.cos(phi), r * Math.sin(theta) * Math.sin(phi), r * Math.cos(theta)));
        }
    }
    return pts;
}

/**
 * NEW: Auto-Scan Stability Gater
 * Checks the video feed for still objects. If an object is stable,
 * it captures a high-res frame and sends it to the AI pipeline.
 */
export function checkAutoScan(onScanTrigger) {
    if (!videoElement || videoElement.readyState !== 4) return;

    const canvas = document.createElement('canvas');
    canvas.width = 100; // Small resolution for fast pixel checking
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, 100, 100);
    const imageData = ctx.getImageData(0, 0, 100, 100).data;

    if (lastFrameData) {
        let diff = 0;
        for (let i = 0; i < imageData.length; i += 4) {
            diff += Math.abs(imageData[i] - lastFrameData[i]); // Check Red channel difference
        }

        // If pixel difference is low, image is "stable"
        if (diff < STABILITY_THRESHOLD) {
            stabilityCounter++;
        } else {
            stabilityCounter = 0; // Reset if movement detected
        }

        // Trigger scan after ~1.5 seconds of stillness
        if (stabilityCounter >= REQUIRED_STABILITY_FRAMES) {
            console.log("🔭 Auto-Scan: Object Stabilized. Capturing...");
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = videoElement.videoWidth;
            captureCanvas.height = videoElement.videoHeight;
            captureCanvas.getContext('2d').drawImage(videoElement, 0, 0);
            
            const base64 = captureCanvas.toDataURL('image/jpeg').split(',')[1];
            onScanTrigger(base64);
            
            stabilityCounter = -100; // Cooldown after capture
        }
    }
    lastFrameData = imageData;
}

function animate() {
    animationId = requestAnimationFrame(animate);
    if (particles) {
        particles.rotation.y += 0.002 * params.expansion;
        particles.rotation.x += 0.001;
    }
    if (renderer && scene && camera) renderer.render(scene, camera);
}

export function updateVisuals(scale, expansion) {
    if (particles) {
        params.scale = scale;
        params.expansion = expansion;
        particles.scale.setScalar(scale);
    }
}

export function changeColor(color) {
    if (material) material.color.set(color);
    params.color = color;
}

export function changeSize(size) {
    if (material) material.size = size;
    params.particleSize = size;
}

export function handleResize(container) {
    if (camera && renderer && container) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
}

export async function initHandTracking(videoElementId, onHandsDetected) {
    try {
        videoElement = document.getElementById(videoElementId);
        const { Hands } = await import('@mediapipe/hands');
        const { Camera } = await import('@mediapipe/camera_utils');
        
        hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6
        });

        hands.onResults((results) => {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length === 2) {
                const h1 = results.multiHandLandmarks[0];
                const h2 = results.multiHandLandmarks[1];

                const dist = Math.hypot(h1[0].x - h2[0].x, h1[0].y - h2[0].y);
                const expansion = dist * 4;

                let totalCurl = 0;
                [h1, h2].forEach(hand => {
                    const palm = hand[0];
                    [8, 12, 16, 20].forEach(tip => {
                        totalCurl += Math.hypot(hand[tip].x - palm.x, hand[tip].y - palm.y);
                    });
                });
                const scale = (totalCurl / 8) * 4;

                updateVisuals(scale, expansion);
                if (onHandsDetected) onHandsDetected({ handCount: 2, scale, expansion });
            } else {
                if (onHandsDetected) onHandsDetected({ handCount: results.multiHandLandmarks.length });
            }
        });

        cameraInstance = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({ image: videoElement });
            },
            width: 640, height: 480
        });
        await cameraInstance.start();
        return true;
    } catch (e) {
        console.error("Hand Tracking Init Error:", e);
        return false;
    }
}

export function stopHandTracking() {
    if (cameraInstance) cameraInstance.stop();
    if (hands) hands.close();
}

export function cleanup() {
    stopHandTracking();
    if (animationId) cancelAnimationFrame(animationId);
    if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    if (geometry) geometry.dispose();
    if (material) material.dispose();
    if (renderer) renderer.dispose();
}

// ========================================
// 🚀 CRITICAL: WINDOW EXPORTS
// ========================================
// Export all functions to window object so React hooks can access them
// This allows the hooks to call these functions without direct imports

window.initThree = initThree;
window.createParticles = createParticles;
window.changeColor = changeColor;
window.changeSize = changeSize;
window.handleResize = handleResize;
window.cleanupThree = cleanup;
window.initHandTracking = initHandTracking;
window.stopHandTracking = stopHandTracking;
window.checkAutoScan = checkAutoScan;
window.updateVisuals = updateVisuals;
window.generatePoints = generatePoints;

console.log('✅ Space.js loaded - All functions exported to window');