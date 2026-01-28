import * as THREE from 'three';
import { gsap } from 'gsap';

let scene, camera, renderer, points, geometry, shaderMaterial, animationId;
const POINT_COUNT = 6000;

// --- VERTEX SHADER ---
const vertexShader = `
    // DO NOT declare 'position', 'modelViewMatrix', or 'projectionMatrix'. 
    // Three.js injects them automatically.

    varying vec3 vColor;
    
    uniform float uTime;
    uniform float uProgress;
    uniform vec3 uHandPos;
    uniform float uHandStrength;
    uniform float uHandActive;

    // We must declare 'color' because we enabled vertexColors in the material
    attribute vec3 color; 
    attribute vec3 targetPos;
    attribute vec3 targetColor;

    void main() {
        // 1. Morphing: Interpolate between current and target
        vec3 morphedPos = mix(position, targetPos, uProgress);
        
        // 2. Cosmic Swirl
        float swirl = sin(uProgress * 3.14159) * 2.0;
        morphedPos.x += cos(uTime + morphedPos.z) * swirl;
        morphedPos.y += sin(uTime + morphedPos.x) * swirl;

        // 3. Hand Interaction (The Poke)
        if(uHandActive > 0.5) {
            float dist = distance(morphedPos, uHandPos);
            float radius = 1.5 * uHandStrength;
            if(dist < radius) {
                vec3 dir = normalize(morphedPos - uHandPos);
                morphedPos += dir * (1.0 - dist / radius) * 0.6;
            }
        }

        // 4. Interpolate Color
        vColor = mix(color, targetColor, uProgress);

        // 5. Project to Screen
        vec4 mvPosition = modelViewMatrix * vec4(morphedPos, 1.0);
        gl_PointSize = (20.0 / -mvPosition.z); // Size based on distance
        gl_Position = projectionMatrix * mvPosition;
    }
`;

// --- FRAGMENT SHADER ---
const fragmentShader = `
    varying vec3 vColor;

    void main() {
        // Circular point shaping
        float dist = distance(gl_PointCoord, vec2(0.5));
        if (dist > 0.5) discard;

        // Soft star glow
        float glow = pow(1.0 - (dist * 2.0), 2.0);
        gl_FragColor = vec4(vColor, glow);
    }
`;

export function initPlayground(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 6;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Initial Geometry Setup
    geometry = new THREE.BufferGeometry();
    const pos = new Float32Array(POINT_COUNT * 3);
    const col = new Float32Array(POINT_COUNT * 3);

    // Initial random star cluster
    for(let i=0; i < POINT_COUNT * 3; i++) {
        pos[i] = (Math.random() - 0.5) * 10;
        col[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geometry.setAttribute('targetPos', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geometry.setAttribute('targetColor', new THREE.BufferAttribute(new Float32Array(col), 3));

    shaderMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: {
            uTime: { value: 0 },
            uProgress: { value: 0 },
            uHandPos: { value: new THREE.Vector3(0, 0, 0) },
            uHandStrength: { value: 1.0 },
            uHandActive: { value: 0.0 }
        }
    });

    points = new THREE.Points(geometry, shaderMaterial);
    scene.add(points);

    animate();
}

export function morphTo(targetData) {
    if (!geometry || !shaderMaterial) return;

    // Update the "Target" buffers on the GPU
    // targetData.points and targetData.colors MUST be Float32Arrays from digitizers.js
    geometry.getAttribute('targetPos').copyArray(targetData.points);
    geometry.getAttribute('targetColor').copyArray(targetData.colors);
    geometry.attributes.targetPos.needsUpdate = true;
    geometry.attributes.targetColor.needsUpdate = true;

    // Reset progress and Animate
    shaderMaterial.uniforms.uProgress.value = 0;
    gsap.to(shaderMaterial.uniforms.uProgress, {
        value: 1,
        duration: 2.2,
        ease: "expo.inOut",
        onComplete: () => {
            // Once morph is finished, set current position as the new baseline
            geometry.getAttribute('position').copyArray(targetData.points);
            geometry.getAttribute('color').copyArray(targetData.colors);
            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.color.needsUpdate = true;
            shaderMaterial.uniforms.uProgress.value = 0;
        }
    });
}

export function updatePlaygroundSensors(handData) {
    if (!shaderMaterial) return;
    shaderMaterial.uniforms.uHandPos.value.set(handData.x || 0, handData.y || 0, 0);
    shaderMaterial.uniforms.uHandStrength.value = handData.zProximity || 1.0;
    shaderMaterial.uniforms.uHandActive.value = handData.isPresent ? 1.0 : 0.0;
}

function animate() {
    animationId = requestAnimationFrame(animate);
    if (shaderMaterial) shaderMaterial.uniforms.uTime.value += 0.01;
    if (renderer && scene && camera) renderer.render(scene, camera);
}

export function cleanupPlayground() {
    if (animationId) cancelAnimationFrame(animationId);
    if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
    }
    if (geometry) geometry.dispose();
    if (shaderMaterial) shaderMaterial.dispose();
    scene = null; camera = null; renderer = null; points = null;
}