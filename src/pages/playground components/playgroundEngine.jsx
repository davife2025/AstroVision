import * as THREE from 'three';
import { gsap } from 'gsap';

let scene, camera, renderer, points, geometry, shaderMaterial, animationId;
const POINT_COUNT = 6000;

const vertexShader = `
    varying vec3 vColor;
    uniform float uTime;
    uniform float uProgress;
    uniform vec3 uHandPos;
    uniform float uHandStrength;
    uniform float uHandActive;
    attribute vec3 targetPos;
    attribute vec3 targetColor;

    void main() {
        // 1. Morph Path
        vec3 morphedPos = mix(position, targetPos, uProgress);
        
        // 2. Transition Swirl
        float swirl = sin(uProgress * 3.1415) * 2.0;
        morphedPos.x += cos(uTime + morphedPos.z) * swirl;
        morphedPos.y += sin(uTime + morphedPos.x) * swirl;

        // 3. Magnetic Interaction (Hand Sensor)
        if(uHandActive > 0.5) {
            float dist = distance(morphedPos, uHandPos);
            float radius = 1.5 * uHandStrength;
            if(dist < radius) {
                vec3 dir = normalize(morphedPos - uHandPos);
                morphedPos += dir * (1.0 - dist / radius) * 0.6;
            }
        }

        vColor = mix(color, targetColor, uProgress);
        vec4 mvPosition = modelViewMatrix * vec4(morphedPos, 1.0);
        gl_PointSize = (20.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    varying vec3 vColor;
    void main() {
        float dist = distance(gl_PointCoord, vec2(0.5));
        if (dist > 0.5) discard;
        gl_FragColor = vec4(vColor, pow(1.0 - (dist * 2.0), 2.0));
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

    geometry = new THREE.BufferGeometry();
    const pos = new Float32Array(POINT_COUNT * 3);
    const col = new Float32Array(POINT_COUNT * 3);
    for(let i=0; i<POINT_COUNT*3; i++) { pos[i] = (Math.random()-0.5)*10; col[i] = Math.random(); }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geometry.setAttribute('targetPos', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geometry.setAttribute('targetColor', new THREE.BufferAttribute(new Float32Array(col), 3));

    shaderMaterial = new THREE.ShaderMaterial({
        vertexShader, fragmentShader, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        uniforms: { uTime: {value:0}, uProgress: {value:0}, uHandPos: {value: new THREE.Vector3()}, uHandStrength: {value:1}, uHandActive: {value:0} }
    });

    points = new THREE.Points(geometry, shaderMaterial);
    scene.add(points);
    if(window.createEarth) window.createEarth(scene);
    animate();
}

export function morphTo(targetData) {
    if (!geometry || !shaderMaterial) return;
    geometry.getAttribute('targetPos').set(targetData.points);
    geometry.getAttribute('targetColor').set(targetData.colors);
    geometry.attributes.targetPos.needsUpdate = true;
    geometry.attributes.targetColor.needsUpdate = true;

    gsap.to(shaderMaterial.uniforms.uProgress, {
        value: 1, duration: 2.2, ease: "expo.inOut",
        onComplete: () => {
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

export function cleanupPlayground() {
    if (animationId) cancelAnimationFrame(animationId);
    if (renderer) renderer.dispose();
}