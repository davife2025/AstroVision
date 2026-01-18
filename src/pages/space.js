// src/space.js
import * as THREE from 'three';

let scene, camera, renderer, particles, geometry, material;
let animationId;

const params = {
    color: '#00ffcc',
    template: 'heart',
    particleSize: 0.05,
    expansion: 1.0,
    scale: 1.0
};

export function initThree(containerId) {
    const container = document.getElementById(containerId);
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    createParticles();
    animate();

    return { scene, camera, renderer };
}

export function createParticles(template = 'heart') {
    if (particles) scene.remove(particles);

    const points = generatePoints(template);
    geometry = new THREE.BufferGeometry().setFromPoints(points);
    material = new THREE.PointsMaterial({
        color: params.color,
        size: params.particleSize,
        transparent: true,
        blending: THREE.AdditiveBlending
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

export function generatePoints(type) {
    const pts = [];
    const count = 5000;
    
    for (let i = 0; i < count; i++) {
        let x, y, z;
        
        if (type === 'heart') {
            const t = Math.random() * Math.PI * 2;
            x = 16 * Math.pow(Math.sin(t), 3);
            y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            pts.push(new THREE.Vector3(x * 0.1, y * 0.1, (Math.random() - 0.5) * 0.5));
        } else if (type === 'flower') {
            const t = Math.random() * Math.PI * 2;
            const r = 2 * Math.cos(5 * t);
            x = r * Math.cos(t);
            y = r * Math.sin(t);
            pts.push(new THREE.Vector3(x, y, (Math.random() - 0.5) * 0.2));
        } else if (type === 'saturn') {
            const r = 2 + Math.random() * 1.5;
            const t = Math.random() * Math.PI * 2;
            pts.push(new THREE.Vector3(r * Math.cos(t), (Math.random() - 0.5) * 0.1, r * Math.sin(t)));
        } else if (type === 'fireworks') {
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const r = Math.random() * 2;
            x = r * Math.sin(theta) * Math.cos(phi);
            y = r * Math.sin(theta) * Math.sin(phi);
            z = r * Math.cos(theta);
            pts.push(new THREE.Vector3(x, y, z));
        } else if (type === 'galaxy') {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 3;
            const armOffset = Math.floor(Math.random() * 3) * (Math.PI * 2 / 3);
            x = radius * Math.cos(angle + armOffset + radius * 0.5);
            y = (Math.random() - 0.5) * 0.3;
            z = radius * Math.sin(angle + armOffset + radius * 0.5);
            pts.push(new THREE.Vector3(x, y, z));
        } else if (type === 'sphere') {
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const r = 2;
            x = r * Math.sin(theta) * Math.cos(phi);
            y = r * Math.sin(theta) * Math.sin(phi);
            z = r * Math.cos(theta);
            pts.push(new THREE.Vector3(x, y, z));
        }
    }
    
    return pts;
}

function animate() {
    animationId = requestAnimationFrame(animate);
    
    if (particles) {
        particles.rotation.y += 0.005;
        particles.rotation.x += 0.002;
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

export function updateVisuals(scale = 1.0) {
    if (particles) {
        particles.scale.setScalar(scale);
    }
}

export function changeColor(color) {
    if (material) {
        material.color.set(color);
    }
    params.color = color;
}

export function changeSize(size) {
    if (material) {
        material.size = size;
    }
    params.particleSize = size;
}

export function handleResize(container) {
    if (camera && renderer && container) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
}

export function cleanup() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    if (geometry) geometry.dispose();
    if (material) material.dispose();
    if (renderer) renderer.dispose();
}