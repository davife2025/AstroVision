import * as THREE from 'three';
import { gsap } from 'gsap';

let scene, camera, renderer, points, geometry, shaderMaterial;
let animationId;
const POINT_COUNT = 6000;

// --- VERTEX SHADER ---
const vertexShader = `
    // These are the ONLY things we need to declare. 
    // Three.js injects 'position', 'modelViewMatrix', and 'projectionMatrix' automatically.

    varying vec3 vColor;
    varying float vOpacity;

    uniform float uTime;
    uniform float uProgress;
    uniform vec3 uHandPos;
    uniform float uHandStrength;
    uniform float uHandActive;

    // Custom attributes we added to our BufferGeometry
    attribute vec3 color; 
    attribute vec3 targetPos;
    attribute vec3 targetColor;

    void main() {
        // 1. Morphing Logic: position is built-in
        vec3 morphedPos = mix(position, targetPos, uProgress);
        
        // 2. Swirl Effect
        float swirl = sin(uProgress * 3.14159) * 2.0;
        morphedPos.x += cos(uTime + morphedPos.z) * swirl;
        morphedPos.y += sin(uTime + morphedPos.x) * swirl;

        // 3. Magnetic Interaction (Hand Poke)
        if(uHandActive > 0.5) {
            float dist = distance(morphedPos, uHandPos);
            float radius = 1.8 * uHandStrength;
            
            if(dist < radius) {
                vec3 dir = normalize(morphedPos - uHandPos);
                float force = (1.0 - dist / radius) * 0.6;
                morphedPos += dir * force;
            }
        }

        // 4. Color Logic: Pass to Fragment
        vColor = mix(color, targetColor, uProgress);
        vOpacity = 1.0;

        // 5. Final Projection: modelViewMatrix and projectionMatrix are built-in
        vec4 mvPosition = modelViewMatrix * vec4(morphedPos, 1.0);
        gl_PointSize = (16.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

// --- FRAGMENT SHADER ---
const fragmentShader = `
    varying vec3 vColor;
    varying float vOpacity;

    void main() {
        float dist = distance(gl_PointCoord, vec2(0.5));
        if (dist > 0.5) discard;

        float glow = pow(1.0 - (dist * 2.0), 2.0);
        gl_FragColor = vec4(vColor, glow * vOpacity);
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

    // Initial Buffer Data
    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(POINT_COUNT * 3);
    const colors = new Float32Array(POINT_COUNT * 3);

    for(let i=0; i < POINT_COUNT * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 10;
        colors[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('targetPos', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('targetColor', new THREE.BufferAttribute(new Float32Array(colors), 3));

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

    // Trigger global Earth background if available
    if (window.createEarth) window.createEarth(scene);
    
    animate();
}

export function morphTo(targetData) {
    if (!geometry || !shaderMaterial) return;

    geometry.getAttribute('targetPos').copyArray(targetData.points);
    geometry.getAttribute('targetColor').copyArray(targetData.colors);
    geometry.attributes.targetPos.needsUpdate = true;
    geometry.attributes.targetColor.needsUpdate = true;

    gsap.to(shaderMaterial.uniforms.uProgress, {
        value: 1,
        duration: 2.2,
        ease: "expo.inOut",
        onComplete: () => {
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