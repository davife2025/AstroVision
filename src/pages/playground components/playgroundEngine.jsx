import * as THREE from 'three';
import { gsap } from 'gsap';

let scene, camera, renderer, points, geometry, shaderMaterial, animationId;
const POINT_COUNT = 6000;

// --- VERTEX SHADER ---
const vertexShader = `
    // DO NOT declare built-ins like position, modelViewMatrix, or projectionMatrix.
    // Three.js injects them automatically.

    varying vec3 vColor;
    
    uniform float uTime;
    uniform float uProgress;
    uniform vec3 uHandPos;
    uniform float uHandStrength;
    uniform float uHandActive;

    // Custom attributes we defined in BufferGeometry
    attribute vec3 color; 
    attribute vec3 targetPos;
    attribute vec3 targetColor;

    void main() {
        // 1. Morphing: Interpolate between current position and target
        vec3 morphedPos = mix(position, targetPos, uProgress);
        
        // 2. Cosmic Swirl: Add a curve to the movement path
        float swirl = sin(uProgress * 3.14159) * 2.0;
        morphedPos.x += cos(uTime + morphedPos.z) * swirl;
        morphedPos.y += sin(uTime + morphedPos.x) * swirl;

        // 3. Hand Interaction (The Magnetic "Poke")
        if(uHandActive > 0.5) {
            float dist = distance(morphedPos, uHandPos);
            float radius = 1.5 * uHandStrength;
            if(dist < radius) {
                vec3 dir = normalize(morphedPos - uHandPos);
                // Push particles away from the hand coordinate
                morphedPos += dir * (1.0 - dist / radius) * 0.6;
            }
        }

        // 4. Color Logic
        vColor = mix(color, targetColor, uProgress);

        // 5. Final Screen Projection
        vec4 mvPosition = modelViewMatrix * vec4(morphedPos, 1.0);
        gl_PointSize = (20.0 / -mvPosition.z); // Scale size by distance
        gl_Position = projectionMatrix * mvPosition;
    }
`;

// --- FRAGMENT SHADER ---
const fragmentShader = `
    varying vec3 vColor;

    void main() {
        // Turn the square point into a soft glowing circle
        float dist = distance(gl_PointCoord, vec2(0.5));
        if (dist > 0.5) discard;

        float glow = pow(1.0 - (dist * 2.0), 2.0);
        gl_FragColor = vec4(vColor, glow);
    }
`;
// src/pages/playground components/playgroundEngine.js

// ... (keep your existing shader strings and variables) ...

export function initPlayground(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5; // Moved slightly closer for a better view

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // --- THE RESIZE FIX ---
    const onWindowResize = () => {
        if (!container || !camera || !renderer) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // Initial Buffer Geometry Setup
    geometry = new THREE.BufferGeometry();
    const pos = new Float32Array(POINT_COUNT * 3);
    const col = new Float32Array(POINT_COUNT * 3);
    for(let i=0; i < POINT_COUNT * 3; i++) {
        pos[i] = (Math.random() - 0.5) * 8;
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

    // Store the resize function on the window so we can remove it during cleanup
    window._playgroundResizeHandler = onWindowResize;
}

export function cleanupPlayground() {
    if (animationId) cancelAnimationFrame(animationId);
    
    // Remove the resize listener
    window.removeEventListener('resize', window._playgroundResizeHandler);

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
export function morphTo(targetData) {
    if (!geometry || !shaderMaterial) return;

    // targetData must contain Float32Arrays for 'points' and 'colors'
    geometry.getAttribute('targetPos').set(targetData.points);
    geometry.getAttribute('targetColor').set(targetData.colors);
    geometry.attributes.targetPos.needsUpdate = true;
    geometry.attributes.targetColor.needsUpdate = true;

    // Reset progress and trigger GSAP
    shaderMaterial.uniforms.uProgress.value = 0;
    gsap.to(shaderMaterial.uniforms.uProgress, {
        value: 1,
        duration: 2.2,
        ease: "expo.inOut",
        onComplete: () => {
            // Once morph is finished, update current base position to the target
            geometry.getAttribute('position').set(targetData.points);
            geometry.getAttribute('color').set(targetData.colors);
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
