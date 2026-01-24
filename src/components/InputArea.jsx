// src/components/InputArea.jsx

import React from 'react';

const InputArea = ({ 
  prompt, 
  setPrompt, 
  imagePreview, 
  loading, 
  onSubmit, 
  onImageSelect,
  onImageRemove,
  fileInputRef 
}) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && onImageSelect) {
      onImageSelect(file);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="input-area">
      {imagePreview && (
        <div className="image-preview-container">
          <img src={imagePreview} alt="Preview" />
          <button 
            onClick={onImageRemove}
            className="remove-image-btn"
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      )}

      <div className="input-controls">
        <input
          type="file"
          ref={fileInputRef}
          hidden
          accept="image/jpeg,image/png,image/jpg,image/webp"
          onChange={handleFileChange}
        />
        
        <button
          className="upload-button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload image"
          disabled={loading}
        >
          add document
        </button>

        <textarea
          className="prompt-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Chat or upload data..."
          disabled={loading}
          rows={1}
        />

        <button
          className="submit-button"
          onClick={onSubmit}
          disabled={loading || (!prompt.trim() && !imagePreview)}
          aria-label="Submit"
        >
          {loading ? 'loading..' : 'send'}
        </button>
      </div>
    </div>
  );
};

export default InputArea;