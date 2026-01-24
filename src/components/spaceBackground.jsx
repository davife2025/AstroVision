import React, { useEffect, useState } from 'react';

const SpaceBackground = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="space-background">
      {/* Earth/Space Background - FIXED PATH */}
      <div 
        className="earth-container" 
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 20% 50%, rgba(0, 102, 255, 0.69) 0%, transparent 0%),
            radial-gradient(ellipse at 80% 50%, rgba(100, 201, 255, 0.94) 0%, transparent 0%),
            url(${process.env.PUBLIC_URL}/guillermo-ferla-Oze6U2m1oYU-unsplash.jpg)
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Stars Layer */}
      <div className="stars-layer" />

      {/* Floating Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animation: `float ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}

      {/* Orbital Path */}
      <div className="orbital-path" />
      
      <div className="orbital-path" style={{ 
        width: '75%', 
        height: '75%',
        animationDuration: '40s',
        animationDirection: 'reverse'
      }} />

      {/* Light Rays */}
      <div className="light-rays" />

      {/* Atmospheric Glow */}
      <div className="atmospheric-glow" />

      {/* Grid Overlay */}
      <div className="grid-overlay" />

      {/* Scan Lines */}
      <div className="scan-lines" />
    </div>
  );
};

export default SpaceBackground;