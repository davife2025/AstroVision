import * as THREE from 'three';
import { gsap } from 'gsap';

let scene, camera, renderer, particles, geometry, material;
let animationId;
let videoElement, cameraInstance;
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
    const container = document.getElementById(containerId);
    if (!container) return { scene: null };
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 8; 

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Initial particle creation
    await createParticles(params.template);
    animate();

    return { scene, camera, renderer };
}

/**
 * 2. Create Floating Earth Background
 * Creates Earth with Night Lights and Atmospheric Glow
 */
export async function createEarth(targetScene) {
    if (!targetScene) return;
    const loader = new THREE.TextureLoader();

    // Earth Sphere
    const earthGeo = new THREE.SphereGeometry(2.5, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
        map: loader.load('https://raw.githubusercontent.com/tbaltazar/earth-js/master/img/earthmap1k.jpg'),
        bumpMap: loader.load('https://raw.githubusercontent.com/tbaltazar/earth-js/master/img/earthbump1k.jpg'),
        bumpScale: 0.05,
    });

    earth = new THREE.Mesh(earthGeo, earthMat);
    earth.position.set(-4, 0, -2); // Positioned left as per HUD design
    targetScene.add(earth);

    // Atmosphere Glow Shader (Fresnel Effect)
    const atmosGeo = new THREE.SphereGeometry(2.55, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
            }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true
    });

    atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    atmosphere.position.copy(earth.position);
    targetScene.add(atmosphere);

    // Lighting for the Crescent Glint
    sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(-10, 5, 5); 
    targetScene.add(sunLight);
    
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    targetScene.add(ambient);
}

/**
 * 3. Main Particle Generator
 */
export function generatePoints(type) {
    const pts = [];
    const colors = [];
    const count = params.pointCount;

    if (type === 'universe_complex') {
        for (let i = 0; i < 3000; i++) {
            const angle = Math.random() * Math.PI * 20;
            const radius = Math.random() * 5;
            const x = radius * Math.cos(angle + radius * 0.5);
            const z = radius * Math.sin(angle + radius * 0.5);
            const y = (Math.random() - 0.5) * (1 / (radius + 0.1));
            pts.push(new THREE.Vector3(x, y, z));
            colors.push(0.5, 0.8, 1.0);
        }
        const planets = [
            { dist: 1.5, size: 0.15, col: [0.2, 0.5, 1.0] },
            { dist: 2.5, size: 0.35, col: [0.8, 0.6, 0.4] },
            { dist: 4.0, size: 0.3,  col: [0.9, 0.8, 0.5] }
        ];
        planets.forEach((p) => {
            const orbitAngle = Math.random() * Math.PI * 2;
            for (let j = 0; j < 333; j++) {
                const phi = Math.random() * Math.PI * 2;
                const theta = Math.random() * Math.PI;
                const r = Math.random() * p.size;
                pts.push(new THREE.Vector3(
                    (r * Math.sin(theta) * Math.cos(phi)) + (p.dist * Math.cos(orbitAngle)),
                    (r * Math.sin(theta) * Math.sin(phi)),
                    (r * Math.cos(theta)) + (p.dist * Math.sin(orbitAngle))
                ));
                colors.push(p.col[0], p.col[1], p.col[2]);
            }
        });
        while (pts.length < count) {
            pts.push(new THREE.Vector3((Math.random()-0.5)*20, (Math.random()-0.5)*20, (Math.random()-0.5)*20));
            colors.push(0.8, 0.2, 0.8);
        }
    } else {
        for (let i = 0; i < count; i++) {
            let x, y, z = 0;
            if (type === 'heart') {
                const t = Math.random() * Math.PI * 2;
                x = 16 * Math.pow(Math.sin(t), 3) * 0.15;
                y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.15;
                z = (Math.random() - 0.5) * 0.2;
            } else if (type === 'flower') {
                const t = Math.random() * Math.PI * 2;
                const r = 3 * Math.cos(5 * t);
                x = r * Math.cos(t); y = r * Math.sin(t); z = (Math.random() - 0.5) * 0.2;
            } else if (type === 'galaxy') {
                const angle = Math.random() * Math.PI * 2;
                const rad = Math.random() * 4;
                x = rad * Math.cos(angle + rad * 0.6); z = rad * Math.sin(angle + rad * 0.6); y = (Math.random() - 0.5) * 0.3;
            } else {
                const phi = Math.random() * Math.PI * 2;
                const theta = Math.random() * Math.PI;
                x = 2.5 * Math.sin(theta) * Math.cos(phi); y = 2.5 * Math.sin(theta) * Math.sin(phi); z = 2.5 * Math.cos(theta);
            }
            pts.push(new THREE.Vector3(x, y, z));
            colors.push(0, 1, 0.8);
        }
    }
    return { pts, colors };
}

/**
 * 4. Particle Orchestrator (Morphing)
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
        material = new THREE.PointsMaterial({ size: params.particleSize, transparent: true, blending: THREE.AdditiveBlending, vertexColors: true });
        particles = new THREE.Points(geometry, material);
        scene.add(particles);
    } 

    if (geometry && geometry.attributes.position) {
        const posAttr = geometry.attributes.position.array;
        const colAttr = geometry.attributes.color.array;
        targetData.pts.forEach((pt, i) => {
            const idx = i * 3;
            gsap.to(posAttr, { [idx]: pt.x, [idx+1]: pt.y, [idx+2]: pt.z, duration: 2, ease: "power2.inOut" });
            gsap.to(colAttr, { [idx]: targetData.colors[idx], [idx+1]: targetData.colors[idx+1], [idx+2]: targetData.colors[idx+2], duration: 2, onUpdate: () => {
                geometry.attributes.position.needsUpdate = true;
                geometry.attributes.color.needsUpdate = true;
            }});
        });
    }
    params.template = template;
}

/**
 * 5. Image Pixel Sampler
 */
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
                const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
                if (brightness > 30) {
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
 * 6. UI & Sensor Controls
 */
export function changeColor(color) { if (material) material.color.set(color); }
export function changeSize(size) { if (material) material.size = size; }
export function updateVisuals(scale, expansion) {
    if (particles) { params.scale = scale; params.expansion = expansion; particles.scale.setScalar(scale); }
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

/**
 * 7. Hand Tracking & Animation
 */
export async function initHandTracking(videoElementId, onHandsDetected) {
    try {
        videoElement = document.getElementById(videoElementId);
        const { Hands } = await import('@mediapipe/hands');
        const { Camera } = await import('@mediapipe/camera_utils');
        const handsInstance = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
        handsInstance.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
        handsInstance.onResults((results) => {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length === 2) {
                const h1 = results.multiHandLandmarks[0];
                const h2 = results.multiHandLandmarks[1];
                const dist = Math.hypot(h1[0].x - h2[0].x, h1[0].y - h2[0].y);
                updateVisuals(dist * 4, dist * 2);
                if (onHandsDetected) onHandsDetected({ handCount: 2, scale: dist * 4, expansion: dist * 2 });
            }
        });
        cameraInstance = new Camera(videoElement, { onFrame: async () => { await handsInstance.send({ image: videoElement }); }, width: 640, height: 480 });
        await cameraInstance.start();
        return true;
    } catch (e) { return false; }
}

function animate() {
    animationId = requestAnimationFrame(animate);
    if (particles) particles.rotation.y += 0.001 * params.expansion;
    if (earth) earth.rotation.y += 0.0002; // Rotate Earth slowly
    if (renderer && scene && camera) renderer.render(scene, camera);
}

/**
 * 8. Renamed Cleanup for App.jsx compatibility
 */
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
}

// Ensure "cleanup" also points to cleanupThree for safety
export const cleanup = cleanupThree;

// Window Exports for direct access
window.initThree = initThree;
window.createParticles = createParticles;
window.createEarth = createEarth;
window.cleanupThree = cleanupThree;
window.checkAutoScan = checkAutoScan;
window.changeColor = changeColor;