// src/App.jsx - MOBILE RESPONSIVE VERSION

import React, { useState, useRef } from 'react';
import './App.css';

// Components
import ObservationTab from './components/observationTab';
import SpaceSimulation from './components/spaceSimulation';
import InputArea from './components/InputArea';
import Profile from './pages/profile';

// Services
import { runDiscoveryAnalysis, chatWithAstroSage } from './services/aiServices';
import { compressImage, createPreviewURL, validateImageFile } from './services/imageServices';

// Hooks
import { useHandTracking } from './hooks/useHandTracking';
import { useSpaceSimulation } from './hooks/useSpaceSimulation';

// Utils
import { cleanAIResponse } from './utils/helpers';
import { ERROR_MESSAGES } from './utils/constants';

import DAO from './pages/dao';

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

  // Menu & Profile States
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [viewingUserId, setViewingUserId] = useState(null);

  const fileInputRef = useRef(null);
  const userId = useRef(localStorage.getItem('userId') || 'user-' + Math.random().toString(36).substr(2, 9));

  React.useEffect(() => {
    localStorage.setItem('userId', userId.current);
  }, []);

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

  // --- PROFILE HANDLERS ---

  const openProfile = (profileUserId) => {
    setViewingUserId(profileUserId || userId.current);
    setShowProfile(true);
    setShowMenu(false);
  };

  const closeProfile = () => {
    setShowProfile(false);
    setViewingUserId(null);
  };

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
        <div className="header-top" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexWrap: 'wrap'
        }}>
          <h1 className="header-title" style={{
            fontSize: 'clamp(1.2rem, 4vw, 2rem)',
            margin: '10px 0'
          }}>
            🌟 AstroVision
          </h1>
          
          <nav className="nav-menu" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            {/* Menu Button - Left side of nav buttons */}
            <div style={{ position: 'relative', order: -1 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="nav-button"
                style={{
                  background: showMenu ? 'rgba(0,255,204,0.2)' : 'transparent',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  padding: 0,
                  fontSize: '20px',
                  position: 'relative',
                  zIndex: 1001
                }}
                aria-label="Menu"
              >
                ☰
              </button>
              
              {/* Click outside overlay - BEFORE menu */}
              {showMenu && (
                <div
                  onClick={() => setShowMenu(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999
                  }}
                />
              )}
              
              {/* Dropdown Menu */}
              {showMenu && (
                <div style={{
                  position: 'fixed',
                  top: '70px',
                  left: '10px',
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  border: '1px solid rgba(0,255,204,0.3)',
                  borderRadius: '12px',
                  minWidth: '220px',
                  maxWidth: 'calc(100vw - 20px)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  overflow: 'hidden',
                  zIndex: 1002,
                  pointerEvents: 'auto'
                }}>
                  {/* My Profile */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openProfile();
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '15px 20px',
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      pointerEvents: 'auto'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,255,204,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    👤 My Profile
                  </button>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 10px' }} />

                  {/* Navigation Items */}
                  {[
                    { id: 'home', label: '🏠 Observation' },
                    { id: 'space', label: '🚀 Space Simulation' },
                    { id: 'avdao', label: '🌐 Community' },
                    { id: 'playground', label: '🎮 Playground' },
                    { id: 'mars', label: '🔴 Mars' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Clicked:', tab.label); // DEBUG LOG
                        setActiveTab(tab.id);
                        setShowMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '15px 20px',
                        background: activeTab === tab.id ? 'rgba(0,255,204,0.1)' : 'transparent',
                        border: 'none',
                        color: '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        pointerEvents: 'auto'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,255,204,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = activeTab === tab.id ? 'rgba(0,255,204,0.1)' : 'transparent'}
                    >
                      {tab.label}
                    </button>
                  ))}

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 10px' }} />

                  {/* Settings */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '15px 20px',
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      pointerEvents: 'auto'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,255,204,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    ⚙️ Settings
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Navigation Buttons - Hidden on mobile */}
            <style>{`
              @media (max-width: 768px) {
                .nav-button:not([aria-label="Menu"]) {
                  display: none !important;
                }
              }
            `}</style>
            
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
              onClick={() => setActiveTab('avdao')}
              className={`nav-button ${activeTab === 'avdao' ? 'active' : ''}`}
            >
              🌐 Community
            </button>
            <button
              onClick={() => setActiveTab('playground')}
              className={`nav-button ${activeTab === 'playground' ? 'active' : ''}`}
            >
              🎮 Playground
            </button>
            <button
              onClick={() => setActiveTab('mars')}
              className={`nav-button ${activeTab === 'mars' ? 'active' : ''}`}
            >
              🔴 Mars
            </button>
          </nav>
        </div>
      </header>

      {/* Tab Content */}
      {activeTab === 'home' && (
        <ObservationTab
          responses={responses}
          loading={loading}
          loadingStage={loadingStage}
        />
      )}

      {activeTab === 'space' && (
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

      {activeTab === 'avdao' && <DAO onViewProfile={openProfile} />}

      {activeTab === 'playground' && (
        <div className="main-content">
          <h2>🎮 Playground - Coming Soon</h2>
        </div>
      )}

      {activeTab === 'mars' && (
        <div className="main-content">
          <h2>🔴 Mars - Coming Soon</h2>
        </div>
      )}

      {/* Input Area (only on home tab) */}
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

      {/* Error Notification */}
      {error && (
        <div className="error-notification" style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '15px 20px',
          background: '#ff4444',
          color: '#fff',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 2000,
          maxWidth: 'calc(100vw - 40px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {error}
          <button 
            onClick={() => setError('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 5px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <Profile
          profileUserId={viewingUserId}
          onClose={closeProfile}
        />
      )}
    </div>
  );
}

export default App;