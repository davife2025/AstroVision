// src/components/SpaceSimulation.jsx

import React from 'react';

const SpaceSimulation = ({ 
  handTrackingEnabled, 
  handStatus = { handCount: 0, scale: 1.0, expansion: 1.0 }, 
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
            style={{ display: 'none' ,
                       position: 'absolute',
                        top: '-9999px',        // ✅ Off-screen
                        left: '-9999px',       // ✅ Off-screen
                        width: '1px',          // ✅ Minimal size
                        height: '1px',         // ✅ Minimal size
                        opacity: 0,            // ✅ Invisible
                        pointerEvents: 'none', // ✅ Not clickable
                        visibility: 'hidden'   // ✅ Hidden from DOM
            }}
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
                <span className="value">{handStatus?.handCount || 0}</span>
              </div>
              <div className="hand-stat">
                <span className="label">Scale:</span>
                <span className="value">{handStatus?.scale ? handStatus.scale.toFixed(2) : '1.00'}</span>
              </div>
              <div className="hand-stat">
                <span className="label">Expansion:</span>
                <span className="value">{handStatus?.expansion ? handStatus.expansion.toFixed(2) : '1.00'}</span>
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