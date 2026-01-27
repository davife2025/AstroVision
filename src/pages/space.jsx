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
    template: 'heart',
    particleSize: 0.05,
    expansion: 1.0,
    scale: 1.0,
    pointCount: 6000
};

/**
 * 1. Initialize Three.js with TRANSPARENT background
 */
async function initThree(containerId) {
    cleanupThree();

    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container not found:', containerId);
        return null;
    }

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 8;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00ffcc, 1, 1000);
    pointLight.position.set(0, 0, 100);
    scene.add(pointLight);

    await createParticles(params.template);
    animate();

    window.addEventListener('resize', () => onWindowResize(container));

    console.log('✅ Three.js initialized');
    return { scene, camera, renderer };
}

function onWindowResize(container) {
    if (!camera || !renderer || !container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function changeColor(color) {
    if (material) {
        material.color.set(color);
    }
    params.color = color;
}

function changeSize(size) {
    if (material) {
        material.size = size;
    }
    params.particleSize = size;
}

async function createEarth(targetScene) {
    if (!targetScene) targetScene = scene;
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

    const atmosGeo = new THREE.SphereGeometry(2.55, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
        vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec3 vNormal; void main() { float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0); gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity; }`,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true
    });
    
    atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    atmosphere.position.copy(earth.position);
    targetScene.add(atmosphere);

    sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(-10, 5, 5);
    targetScene.add(sunLight);
}

async function createParticles(template, imageSource = null) {
    let targetData;
    
    if (template === 'custom_image' && imageSource) {
        targetData = await generatePointsFromImage(imageSource);
    } else {
        targetData = generatePoints(template);
    }

    if (!particles) {
        geometry = new THREE.BufferGeometry();
        
        const positions = new Float32Array(params.pointCount * 3);
        const colors = new Float32Array(params.pointCount * 3);
        
        for (let i = 0; i < params.pointCount; i++) {
            const i3 = i * 3;
            const pt = targetData.pts[i] || new THREE.Vector3();
            
            positions[i3] = pt.x;
            positions[i3 + 1] = pt.y;
            positions[i3 + 2] = pt.z;
            
            colors[i3] = targetData.colors[i3];
            colors[i3 + 1] = targetData.colors[i3 + 1];
            colors[i3 + 2] = targetData.colors[i3 + 2];
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        material = new THREE.PointsMaterial({
            size: params.particleSize,
            transparent: true,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });

        particles = new THREE.Points(geometry, material);
        scene.add(particles);
    } else {
        const posAttr = geometry.attributes.position.array;
        const colAttr = geometry.attributes.color.array;
        
        const startPos = new Float32Array(posAttr);
        const startCol = new Float32Array(colAttr);

        const transitionProxy = { progress: 0 };
        gsap.to(transitionProxy, {
            progress: 1,
            duration: 2,
            ease: "expo.inOut",
            onUpdate: () => {
                for (let i = 0; i < params.pointCount; i++) {
                    const i3 = i * 3;
                    const targetPt = targetData.pts[i] || new THREE.Vector3();
                    
                    posAttr[i3] = startPos[i3] + (targetPt.x - startPos[i3]) * transitionProxy.progress;
                    posAttr[i3 + 1] = startPos[i3 + 1] + (targetPt.y - startPos[i3 + 1]) * transitionProxy.progress;
                    posAttr[i3 + 2] = startPos[i3 + 2] + (targetPt.z - startPos[i3 + 2]) * transitionProxy.progress;

                    colAttr[i3] = startCol[i3] + (targetData.colors[i3] - startCol[i3]) * transitionProxy.progress;
                    colAttr[i3 + 1] = startCol[i3 + 1] + (targetData.colors[i3 + 1] - startCol[i3 + 1]) * transitionProxy.progress;
                    colAttr[i3 + 2] = startCol[i3 + 2] + (targetData.colors[i3 + 2] - startCol[i3 + 2]) * transitionProxy.progress;
                }
                geometry.attributes.position.needsUpdate = true;
                geometry.attributes.color.needsUpdate = true;
            }
        });
    }
    
    params.template = template;
}

function generatePoints(type) {
    const pts = [];
    const colors = [];
    const count = params.pointCount;

    if (type === 'galaxy' || type === 'universe_complex') {
        for (let i = 0; i < 3000; i++) {
            const angle = Math.random() * Math.PI * 20;
            const r = Math.random() * 5;
            pts.push(new THREE.Vector3(r * Math.cos(angle + r * 0.5), (Math.random() - 0.5) * 0.1, r * Math.sin(angle + r * 0.5)));
            colors.push(0.5, 0.8, 1.0);
        }
        while (pts.length < count) {
            pts.push(new THREE.Vector3((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15));
            colors.push(0.8, 0.2, 0.8);
        }
    } else if (type === 'heart') {
        for (let i = 0; i < count; i++) {
            const t = Math.random() * Math.PI * 2;
            const x = 16 * Math.pow(Math.sin(t), 3) * 0.15;
            const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.15;
            const z = (Math.random() - 0.5) * 0.2;
            pts.push(new THREE.Vector3(x, y, z));
            colors.push(1.0, 0.2, 0.5);
        }
    } else if (type === 'saturn') {
        for (let i = 0; i < count / 2; i++) {
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const r = 1.5;
            pts.push(new THREE.Vector3(r * Math.sin(theta) * Math.cos(phi), r * Math.sin(theta) * Math.sin(phi), r * Math.cos(theta)));
            colors.push(0.9, 0.7, 0.3);
        }
        for (let i = count / 2; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 2 + Math.random() * 1.5;
            pts.push(new THREE.Vector3(r * Math.cos(angle), (Math.random() - 0.5) * 0.1, r * Math.sin(angle)));
            colors.push(0.8, 0.6, 0.4);
        }
    } else if (type === 'fireworks') {
        for (let i = 0; i < count; i++) {
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const r = 2 + Math.random() * 2;
            pts.push(new THREE.Vector3(r * Math.sin(theta) * Math.cos(phi), r * Math.sin(theta) * Math.sin(phi), r * Math.cos(theta)));
            colors.push(1.0, 0.2, 0.2);
        }
    } else {
        for (let i = 0; i < count; i++) {
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const r = 2.5;
            pts.push(new THREE.Vector3(r * Math.sin(theta) * Math.cos(phi), r * Math.sin(theta) * Math.sin(phi), r * Math.cos(theta)));
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
            canvas.width = 128;
            canvas.height = 128;
            ctx.drawImage(img, 0, 0, 128, 128);
            const data = ctx.getImageData(0, 0, 128, 128).data;
            const pts = [];
            const colors = [];
            const valid = [];
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] + data[i + 1] + data[i + 2] > 50) {
                    const idx = i / 4;
                    valid.push({ x: (idx % 128) / 128 * 8 - 4, y: -(Math.floor(idx / 128)) / 128 * 8 + 4, r: data[i] / 255, g: data[i + 1] / 255, b: data[i + 2] / 255 });
                }
            }
            for (let i = 0; i < params.pointCount; i++) {
                const p = valid.length > 0 ? valid[i % valid.length] : { x: 0, y: 0, r: 0, g: 1, b: 0.8 };
                pts.push(new THREE.Vector3(p.x, p.y, (Math.random() - 0.5) * 0.2));
                colors.push(p.r, p.g, p.b);
            }
            resolve({ pts, colors });
        };
        img.onerror = () => {
            resolve(generatePoints('sphere'));
        };
    });
}

function animate() {
    animationId = requestAnimationFrame(animate);
    if (particles) particles.rotation.y += 0.001 * params.expansion;
    if (earth) earth.rotation.y += 0.0002;
    if (renderer && scene && camera) renderer.render(scene, camera);
}

function updateVisuals(scale, expansion) {
    if (particles) {
        params.scale = scale;
        params.expansion = expansion;
        particles.scale.setScalar(scale);
    }
}

function checkAutoScan(onScanTrigger) {
    if (!videoElement || videoElement.readyState !== 4) return;
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, 100, 100);
    const data = ctx.getImageData(0, 0, 100, 100).data;
    if (lastFrameData) {
        let diff = 0;
        for (let i = 0; i < data.length; i += 4) {
            diff += Math.abs(data[i] - lastFrameData[i]);
        }
        if (diff < STABILITY_THRESHOLD) {
            stabilityCounter++;
        } else {
            stabilityCounter = 0;
        }
        if (stabilityCounter >= REQUIRED_STABILITY_FRAMES) {
            const cap = document.createElement('canvas');
            cap.width = videoElement.videoWidth;
            cap.height = videoElement.videoHeight;
            cap.getContext('2d').drawImage(videoElement, 0, 0);
            onScanTrigger(cap.toDataURL('image/jpeg').split(',')[1]);
            stabilityCounter = -100;
        }
    }
    lastFrameData = data;
}

async function initHandTracking(videoElementId, onHandsDetected) {
    try {
        console.log('🖐️ Initializing hand tracking...');
        await new Promise(resolve => setTimeout(resolve, 200));

        videoElement = document.getElementById(videoElementId);
        if (!videoElement) {
            console.error(`❌ Video element "${videoElementId}" not found`);
            return false;
        }

        console.log('✅ Video element found');

        const { Hands } = await import('@mediapipe/hands');
        const { Camera } = await import('@mediapipe/camera_utils');
        
        console.log('✅ MediaPipe loaded');

        const handsInstance = new Hands({ 
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` 
        });

        handsInstance.setOptions({ 
            maxNumHands: 2, 
            modelComplexity: 1, 
            minDetectionConfidence: 0.5, 
            minTrackingConfidence: 0.5 
        });

        handsInstance.onResults((results) => {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length === 2) {
                const h1 = results.multiHandLandmarks[0];
                const h2 = results.multiHandLandmarks[1];
                const dist = Math.hypot(h1[0].x - h2[0].x, h1[0].y - h2[0].y);
                updateVisuals(dist * 4, dist * 2);
                if (onHandsDetected) {
                    onHandsDetected({ handCount: 2, scale: dist * 4, expansion: dist * 2 });
                }
            } else {
                if (onHandsDetected) {
                    onHandsDetected({ handCount: results.multiHandLandmarks ? results.multiHandLandmarks.length : 0 });
                }
            }
        });

        cameraInstance = new Camera(videoElement, { 
            onFrame: async () => { 
                if (videoElement && handsInstance) {
                    await handsInstance.send({ image: videoElement }); 
                }
            }, 
            width: 640, 
            height: 480 
        });

        await cameraInstance.start();
        console.log('✅ Hand tracking enabled');
        return true;
    } catch (e) { 
        console.error("❌ Hand tracking error:", e);
        return false; 
    }
}

function cleanupThree() {
    if (animationId) cancelAnimationFrame(animationId);
    if (cameraInstance) cameraInstance.stop();
    if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
    }
    if (geometry) geometry.dispose();
    if (material) material.dispose();
    scene = null;
    camera = null;
    renderer = null;
    particles = null;
    geometry = null;
    material = null;
    earth = null;
    atmosphere = null;
    cameraInstance = null;
    videoElement = null;
}

// ============================================
// EXPORTS - ALL FUNCTIONS MUST BE HERE
// ============================================
export { 
    initThree,
    createParticles,
    createEarth,
    changeColor,
    changeSize,
    updateVisuals,
    checkAutoScan,
    initHandTracking,  // ✅ CRITICAL - Must be exported
    cleanupThree
};

export const cleanup = cleanupThree;

// Also make available globally as fallback
if (typeof window !== 'undefined') {
    window.initThree = initThree;
    window.createParticles = createParticles;
    window.initHandTracking = initHandTracking;
    window.cleanupThree = cleanupThree;
}