// src/App.jsx

import React, { useState, useRef } from 'react';
import './App.css';

// Components
import ObservationTab from './components/observationTab';
import SpaceSimulation from './components/spaceSimulation';
import InputArea from './components/InputArea';

// Services
import { runDiscoveryAnalysis, chatWithAstroSage } from './services/aiServices';
import { compressImage, createPreviewURL, validateImageFile } from './services/imageServices';

// Hooks
import { useHandTracking } from './hooks/useHandTracking';
import { useSpaceSimulation } from './hooks/useSpaceSimulation';

// Utils
import { cleanAIResponse } from './utils/helpers';
import { ERROR_MESSAGES } from './utils/constants';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState('');
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState([]);

  // Image States
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const fileInputRef = useRef(null);

  // Custom Hooks
  const {
    handTrackingEnabled,
    handStatus,
    toggleHandTracking,
  } = useHandTracking();

  const handleAutoScan = async (base64) => {
    await handleDiscoveryPipeline(base64, 'Auto-scan captured a new object.');
  };

  const {
    selectedShape,
    changeShape,
    updateSimulationFromAI,
    shapes,
  } = useSpaceSimulation(activeTab === 'space', handTrackingEnabled, handleAutoScan);

  // --- MAIN HANDLERS ---

  const handleImageSelect = (file) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setSelectedImage(file);
    setImagePreview(createPreviewURL(file));
  };

  const handleImageRemove = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!selectedImage && !prompt.trim()) {
      setError(ERROR_MESSAGES.NO_INPUT);
      return;
    }

    setLoading(true);
    setError('');
    setLoadingStage('');

    try {
      if (selectedImage) {
        const base64 = await compressImage(selectedImage);
        await handleDiscoveryPipeline(base64, prompt || 'Analyze this celestial object.');
      } else {
        await handleChatOnly(prompt);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(
        err.message.includes('503')
          ? ERROR_MESSAGES.MODEL_LOADING
          : `Error: ${err.message}`
      );
    } finally {
      setLoading(false);
      setLoadingStage('');
      setSelectedImage(null);
      setImagePreview(null);
      setPrompt('');
    }
  };

  const handleDiscoveryPipeline = async (base64, userQuestion) => {
    const { visualId, discoveryData, aiText } = await runDiscoveryAnalysis(
      base64,
      userQuestion,
      setLoadingStage
    );

    const cleanedResponse = cleanAIResponse(aiText);
    updateSimulationFromAI(aiText, discoveryData.type);

    setResponses((prev) => [
      {
        prompt: userQuestion,
        response: cleanedResponse,
        image: `data:image/jpeg;base64,${base64}`,
        nasaImage: discoveryData.historicalImage,
        vlmId: visualId,
        coords: discoveryData.coords,
      },
      ...prev,
    ]);
  };

  const handleChatOnly = async (text) => {
    setLoadingStage('Thinking...');
    const aiText = await chatWithAstroSage(text);
    updateSimulationFromAI(aiText, 'GALAXY');

    setResponses((prev) => [
      { prompt: text, response: aiText },
      ...prev,
    ]);
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-top">
          <h1 className="header-title">🌟 AstroVision</h1>
          <nav className="nav-menu">
            <button
              onClick={() => setActiveTab('home')}
              className={`nav-button ${activeTab === 'home' ? 'active' : ''}`}
            >
              🏠 Observation
            </button>
            <button
              onClick={() => setActiveTab('space')}
              className={`nav-button ${activeTab === 'space' ? 'active' : ''}`}
            >
              🚀 Space Simulation
            </button>
              <button
              onClick={() => setActiveTab('connect')}
              className={`nav-button ${activeTab === 'connect' ? 'active' : ''}`}
            >
             Connect
            </button>
              <button
              onClick={() => setActiveTab('playground')}
              className={`nav-button ${activeTab === 'playground' ? 'active' : ''}`}
            >
             Playground
            </button>
              <button
              onClick={() => setActiveTab('mars')}
              className={`nav-button ${activeTab === 'mars' ? 'active' : ''}`}
            >
              Mars
            </button>
          </nav>
        </div>
      </header>

      {activeTab === 'home' ? (
        <ObservationTab
          responses={responses}
          loading={loading}
          loadingStage={loadingStage}
        />
      ) : (
        <SpaceSimulation
          handTrackingEnabled={handTrackingEnabled}
          handStatus={handStatus}
          onToggleHandTracking={toggleHandTracking}
          selectedShape={selectedShape}
          shapes={shapes}
          onShapeChange={changeShape}
          loading={loading}
          loadingStage={loadingStage}
        />
      )}

      {activeTab === 'home' && (
        <InputArea
          prompt={prompt}
          setPrompt={setPrompt}
          imagePreview={imagePreview}
          loading={loading}
          onSubmit={handleSubmit}
          onImageSelect={handleImageSelect}
          onImageRemove={handleImageRemove}
          fileInputRef={fileInputRef}
        />
      )}

      {error && (
        <div className="error-notification">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
    </div>
  );
}

export default App;