// src/components/ResponseCard.jsx

import React from 'react';
import { formatCoordinates } from '../utils/helpers';

const ResponseCard = ({ item, index }) => {
  return (
    <div className="response-card animate-fade">
      <div className="comparison-view">
        <div className="img-box">
          <p>Detected:</p>
          {item.image && <img src={item.image} alt="User uploaded" />}
        </div>
        {item.nasaImage && (
          <div className="img-box highlight">
            <p>NASA Historical:</p>
            <img src={item.nasaImage} alt="NASA reference" />
          </div>
        )}
      </div>

      {item.vlmId && (
        <div className="vlm-badge">
          Visual ID: {item.vlmId}
        </div>
      )}

      {item.coords && (
        <div className="coords-info">
           {formatCoordinates(item.coords)}
        </div>
      )}

      <div className="response-text">
        <strong>AstroVision:</strong> {item.response}
      </div>

      {item.prompt && (
        <div className="user-prompt">
          <strong>Your Query:</strong> {item.prompt}
        </div>
      )}
    </div>
  );
};

export default ResponseCard;