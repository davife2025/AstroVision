// src/components/ObservationTab.jsx

import React, { useRef, useEffect } from 'react';
import ResponseCard from './responseCard';

const ObservationTab = ({ responses, loading, loadingStage }) => {
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [responses]);

  return (
    <div className="main-content home">
      {loading && loadingStage && (
        <div className="loading-stage-indicator">
          <div className="spinner"></div>
          <p>{loadingStage}</p>
        </div>
      )}

      {responses.length === 0 && !loading && (
        <div className="empty-state">
          <h2>🌌 Welcome to AstroVision</h2>
          <p>Ready for input. Upload astronomical data, chat with AstroSage, or use Space Lab Auto-Scan.</p>
          <div className="features-list">
            <div className="feature-item">
              <span className="icon">🔭</span>
              <span>Upload space images for analysis</span>
            </div>
            <div className="feature-item">
              <span className="icon">🤖</span>
              <span>Chat with AI about astrophysics</span>
            </div>
            <div className="feature-item">
              <span className="icon">🎯</span>
              <span>Auto-detect celestial objects</span>
            </div>
          </div>
        </div>
      )}

      {responses.map((item, idx) => (
        <ResponseCard key={idx} item={item} index={idx} />
      ))}

      <div ref={chatEndRef} />
    </div>
  );
};

export default ObservationTab;