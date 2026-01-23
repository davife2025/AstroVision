// src/components/SpaceSimulation.jsx

import React from 'react';

const SpaceSimulation = ({ 
  handTrackingEnabled, 
  handStatus, 
  onToggleHandTracking,
  selectedShape,
  shapes,
  onShapeChange,
  loading,
  loadingStage 
}) => {
  return (
    <div className="main-content space">
      <div className="space-container">
        <div id="space-canvas-container" className="space-canvas">
          <video
            id="hand-video"
            autoPlay
            playsInline
            muted
            className="hand-video-overlay"
            style={{ display: handTrackingEnabled ? 'block' : 'none' }}
          />
          {loading && (
            <div className="scan-overlay">
              🔭 {loadingStage || 'SCANNING COSMOS...'}
            </div>
          )}
        </div>

        <div className="hand-status">
          <button
            onClick={onToggleHandTracking}
            className={`hand-tracking-toggle ${handTrackingEnabled ? 'active' : ''}`}
          >
            {handTrackingEnabled ? '👋 Sensors Active' : '✋ Enable Sensors'}
          </button>
          
          {handTrackingEnabled && (
            <div className="hand-info">
              <div className="hand-stat">
                <span className="label">Hands:</span>
                <span className="value">{handStatus.handCount}</span>
              </div>
              <div className="hand-stat">
                <span className="label">Scale:</span>
                <span className="value">{handStatus.scale.toFixed(2)}</span>
              </div>
              <div className="hand-stat">
                <span className="label">Expansion:</span>
                <span className="value">{handStatus.expansion.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-controls">
          <div className="control-group">
            <h3>Particle Shapes</h3>
            <div className="shape-buttons">
              {shapes.map((shape) => (
                <button
                  key={shape}
                  onClick={() => onShapeChange(shape)}
                  className={`shape-btn ${selectedShape === shape ? 'active' : ''}`}
                >
                  {shape.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpaceSimulation;