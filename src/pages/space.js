import * as THREE from 'three';
import { gsap } from 'gsap';

// Module-level variables
let scene, camera, renderer, particles, geometry, material;
let animationId, videoElement, cameraInstance;
let earth, atmosphere, sunLight;

// Auto-Scan Stability Variables
let lastFrameData = null;
let stabilityCounter = 0;
const STABILITY_THRESHOLD = 5000;
const REQUIRED_STABILITY_FRAMES = 40;

const params = {
    color: '#00ffcc',
    template: 'sphere',
    particleSize: 0.05,
    expansion: 1.0,
    scale: 1.0,
    pointCount: 6000
};

/**
 * 1. Initialize Three.js
 */
export async function initThree(containerId) {
    // Thoroughly cleanup any existing instance before starting
    cleanupThree();

    const container = document.getElementById(containerId);
    if (!container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 8;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0); 
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Initial creation
    await createParticles(params.template);
    animate();

    return { scene, camera, renderer };
}

/**
 * Updates the global color tint of the particles.
 * Since we use vertex colors, this acts as a multiplier.
 */
export function changeColor(color) {
    if (material) {
        material.color.set(color);
    }
    params.color = color;
}

/**
 * Updates the particle size in real-time.
 */
export function changeSize(size) {
    if (material) {
        material.size = size;
    }
    params.particleSize = size;
}

/**
 * 2. Create Floating Earth (Added back for your HUD background)
 */
export async function createEarth(targetScene) {
    if (!targetScene) return;
    const loader = new THREE.TextureLoader();
    const earthGeo = new THREE.SphereGeometry(2.5, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
        map: loader.load('https://raw.githubusercontent.com/tbaltazar/earth-js/master/img/earthmap1k.jpg'),
        bumpMap: loader.load('https://raw.githubusercontent.com/tbaltazar/earth-js/master/img/earthbump1k.jpg'),
        bumpScale: 0.05,
    });
    earth = new THREE.Mesh(earthGeo, earthMat);
    earth.position.set(-4, 0, -2);
    targetScene.add(earth);

    // Atmosphere
    const atmosGeo = new THREE.SphereGeometry(2.55, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
        vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec3 vNormal; void main() { float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0); gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity; }`,
        blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true
    });
    atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    atmosphere.position.copy(earth.position);
    targetScene.add(atmosphere);

    sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(-10, 5, 5);
    targetScene.add(sunLight);
    targetScene.add(new THREE.AmbientLight(0x404040, 0.5));
}

/**
 * 3. Particle Orchestrator (High-Performance Morphing)
 */
export async function createParticles(template, imageSource = null) {
    let targetData;
    if (template === 'custom_image' && imageSource) {
        targetData = await generatePointsFromImage(imageSource);
    } else {
        targetData = generatePoints(template);
    }

    if (!particles) {
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(params.pointCount * 3), 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(params.pointCount * 3), 3));

        material = new THREE.PointsMaterial({
            size: params.particleSize,
            transparent: true,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });

        particles = new THREE.Points(geometry, material);
        scene.add(particles);
        
        // Initial state
        const pos = geometry.attributes.position.array;
        const col = geometry.attributes.color.array;
        for (let i = 0; i < params.pointCount * 3; i++) {
            pos[i] = (targetData.pts[Math.floor(i/3)] || new THREE.Vector3())[i%3 === 0 ? 'x' : i%3 === 1 ? 'y' : 'z'];
            col[i] = targetData.colors[i];
        }
    } else {
        // High Performance Morphing: 1 Tween for all points
        const posAttr = geometry.attributes.position.array;
        const colAttr = geometry.attributes.color.array;
        
        // Store current state to interpolate from
        const startPos = new Float32Array(posAttr);
        const startCol = new Float32Array(colAttr);

        // Animate a single progress value from 0 to 1
        const transitionProxy = { progress: 0 };
        gsap.to(transitionProxy, {
            progress: 1,
            duration: 2,
            ease: "expo.inOut",
            onUpdate: () => {
                for (let i = 0; i < params.pointCount; i++) {
                    const i3 = i * 3;
                    const targetPt = targetData.pts[i];
                    
                    // Interpolate Position
                    posAttr[i3] = startPos[i3] + (targetPt.x - startPos[i3]) * transitionProxy.progress;
                    posAttr[i3+1] = startPos[i3+1] + (targetPt.y - startPos[i3+1]) * transitionProxy.progress;
                    posAttr[i3+2] = startPos[i3+2] + (targetPt.z - startPos[i3+2]) * transitionProxy.progress;

                    // Interpolate Color
                    colAttr[i3] = startCol[i3] + (targetData.colors[i3] - startCol[i3]) * transitionProxy.progress;
                    colAttr[i3+1] = startCol[i3+1] + (targetData.colors[i3+1] - startCol[i3+1]) * transitionProxy.progress;
                    colAttr[i3+2] = startCol[i3+2] + (targetData.colors[i3+2] - startCol[i3+2]) * transitionProxy.progress;
                }
                geometry.attributes.position.needsUpdate = true;
                geometry.attributes.color.needsUpdate = true;
            }
        });
    }
    params.template = template;
}

/**
 * 4. Point Generators
 */
export function generatePoints(type) {
    const pts = [];
    const colors = [];
    const count = params.pointCount;

    if (type === 'universe_complex') {
        for (let i = 0; i < 3000; i++) {
            const angle = Math.random() * Math.PI * 20;
            const r = Math.random() * 5;
            pts.push(new THREE.Vector3(r * Math.cos(angle + r * 0.5), (Math.random() - 0.5) * 0.1, r * Math.sin(angle + r * 0.5)));
            colors.push(0.5, 0.8, 1.0);
        }
        // Fill remaining with random stars
        while (pts.length < count) {
            pts.push(new THREE.Vector3((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15));
            colors.push(0.8, 0.2, 0.8);
        }
    } else {
        for (let i = 0; i < count; i++) {
            let x, y, z;
            if (type === 'heart') {
                const t = Math.random() * Math.PI * 2;
                x = 16 * Math.pow(Math.sin(t), 3) * 0.15;
                y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.15;
                z = (Math.random() - 0.5) * 0.2;
            } else {
                const phi = Math.random() * Math.PI * 2;
                const theta = Math.random() * Math.PI;
                x = 2.5 * Math.sin(theta) * Math.cos(phi);
                y = 2.5 * Math.sin(theta) * Math.sin(phi);
                z = 2.5 * Math.cos(theta);
            }
            pts.push(new THREE.Vector3(x, y, z));
            colors.push(0, 1, 0.8);
        }
    }
    return { pts, colors };
}

async function generatePointsFromImage(imageSrc) {
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
            const pts = []; const colors = []; const valid = [];
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] + data[i+1] + data[i+2] > 50) {
                    const idx = i / 4;
                    valid.push({ x: (idx % 128) / 128 * 8 - 4, y: -(Math.floor(idx / 128)) / 128 * 8 + 4, r: data[i]/255, g: data[i+1]/255, b: data[i+2]/255 });
                }
            }
            for (let i = 0; i < params.pointCount; i++) {
                const p = valid.length > 0 ? valid[i % valid.length] : {x:0,y:0,r:0,g:1,b:0.8};
                pts.push(new THREE.Vector3(p.x, p.y, (Math.random()-0.5)*0.2));
                colors.push(p.r, p.g, p.b);
            }
            resolve({ pts, colors });
        };
    });
}

/**
 * 5. Animation & Controls
 */
function animate() {
    animationId = requestAnimationFrame(animate);
    if (particles) particles.rotation.y += 0.001 * params.expansion;
    if (earth) earth.rotation.y += 0.0002;
    if (renderer && scene && camera) renderer.render(scene, camera);
}

export function updateVisuals(scale, expansion) {
    if (particles) {
        params.scale = scale;
        params.expansion = expansion;
        particles.scale.setScalar(scale);
    }
}

export function checkAutoScan(onScanTrigger) {
    if (!videoElement || videoElement.readyState !== 4) return;
    const canvas = document.createElement('canvas');
    canvas.width = 100; canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, 100, 100);
    const data = ctx.getImageData(0, 0, 100, 100).data;
    if (lastFrameData) {
        let diff = 0;
        for (let i = 0; i < data.length; i += 4) diff += Math.abs(data[i] - lastFrameData[i]);
        if (diff < STABILITY_THRESHOLD) stabilityCounter++;
        else stabilityCounter = 0;
        if (stabilityCounter >= REQUIRED_STABILITY_FRAMES) {
            const cap = document.createElement('canvas');
            cap.width = videoElement.videoWidth; cap.height = videoElement.videoHeight;
            cap.getContext('2d').drawImage(videoElement, 0, 0);
            onScanTrigger(cap.toDataURL('image/jpeg').split(',')[1]);
            stabilityCounter = -100;
        }
    }
    lastFrameData = data;
}

export async function initHandTracking(videoElementId, onHandsDetected) {
    try {
        // 1. Wait a tiny bit for React to finish rendering the DOM
        await new Promise(resolve => setTimeout(resolve, 100));

        videoElement = document.getElementById(videoElementId);
        
        // 2. CRITICAL CHECK: If the element is still null, stop here instead of crashing
        if (!videoElement) {
            console.error(`❌ Video element with ID ${videoElementId} not found.`);
            return false;
        }

        const { Hands } = await import('@mediapipe/hands');
        const { Camera } = await import('@mediapipe/camera_utils');
        
        const handsInstance = new Hands({ 
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` 
        });

        handsInstance.setOptions({ 
            maxNumHands: 2, 
            modelComplexity: 1, 
            minDetectionConfidence: 0.6, 
            minTrackingConfidence: 0.6 
        });

        handsInstance.onResults((results) => {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length === 2) {
                const h1 = results.multiHandLandmarks[0];
                const h2 = results.multiHandLandmarks[1];
                const dist = Math.hypot(h1[0].x - h2[0].x, h1[0].y - h2[0].y);
                updateVisuals(dist * 4, dist * 2);
                if (onHandsDetected) onHandsDetected({ handCount: 2, scale: dist * 4, expansion: dist * 2 });
            } else {
                if (onHandsDetected) onHandsDetected({ handCount: results.multiHandLandmarks ? results.multiHandLandmarks.length : 0 });
            }
        });

        cameraInstance = new Camera(videoElement, { 
            onFrame: async () => { 
                if (videoElement) await handsInstance.send({ image: videoElement }); 
            }, 
            width: 640, 
            height: 480 
        });

        await cameraInstance.start();
        return true;
    } catch (e) { 
        console.error("Hand Tracking Error:", e);
        return false; 
    }
}
export function cleanupThree() {
    if (animationId) cancelAnimationFrame(animationId);
    if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
    }
    if (geometry) geometry.dispose();
    if (material) material.dispose();
    
    // Reset global variables to prevent ghosting
    scene = null; camera = null; renderer = null; particles = null; 
    geometry = null; material = null; earth = null; atmosphere = null;
}

// Global Exports
window.initThree = initThree;
window.createParticles = createParticles;
window.createEarth = createEarth;
window.cleanupThree = cleanupThree;
window.changeColor = changeColor;
window.changeSize = changeSize;
export const cleanup = cleanupThree;
