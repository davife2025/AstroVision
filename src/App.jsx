// src/App.jsx - FULLY FIXED VERSION

import React, { useState, useRef } from 'react';
import './App.css';

// Components
import ObservationTab from './components/observationTab';
import SpaceSimulation from './components/spaceSimulation';
import InputArea from './components/InputArea';
import Profile from './pages/profile';
import SignIn from './pages/signin';
import DAO from './pages/dao';
import SpaceBackground from './components/spaceBackground';

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
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [viewingUserId, setViewingUserId] = useState(null);
  const [showSignIn, setShowSignIn] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const fileInputRef = useRef(null);
  const userId = useRef(localStorage.getItem('userId') || 'user-' + Math.random().toString(36).substr(2, 9));

  React.useEffect(() => {
    localStorage.setItem('userId', userId.current);
  }, []);

  React.useEffect(() => {
    const authData = localStorage.getItem('userAuth');
    if (authData) {
      try {
        const user = JSON.parse(authData);
        setCurrentUser(user);
        setIsAuthenticated(true);
        setShowSignIn(false);
      } catch (err) {
        console.error('Auth parse error:', err);
      }
    }
    setAuthChecked(true);
  }, []);

  const { handTrackingEnabled, handStatus, toggleHandTracking } = useHandTracking();

  const handleAutoScan = async (base64) => {
    await handleDiscoveryPipeline(base64, 'Auto-scan captured a new object.');
  };

  const { selectedShape, changeShape, updateSimulationFromAI, shapes } = useSpaceSimulation(activeTab === 'space', handTrackingEnabled, handleAutoScan);

  const handleSignIn = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setShowSignIn(false);
  };

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      localStorage.removeItem('userAuth');
      setCurrentUser(null);
      setIsAuthenticated(false);
      setShowSignIn(true);
      setActiveTab('home');
      setShowMenu(false);
    }
  };

  const openProfile = (profileUserId) => {
    setViewingUserId(profileUserId || userId.current);
    setShowProfile(true);
    setShowMenu(false);
  };

  const closeProfile = () => {
    setShowProfile(false);
    setViewingUserId(null);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setShowMenu(false);
  };

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
      setError(err.message.includes('503') ? ERROR_MESSAGES.MODEL_LOADING : `Error: ${err.message}`);
    } finally {
      setLoading(false);
      setLoadingStage('');
      setSelectedImage(null);
      setImagePreview(null);
      setPrompt('');
    }
  };

  const handleDiscoveryPipeline = async (base64, userQuestion) => {
    const { visualId, discoveryData, aiText } = await runDiscoveryAnalysis(base64, userQuestion, setLoadingStage);
    const cleanedResponse = cleanAIResponse(aiText);
    updateSimulationFromAI(aiText, discoveryData.type);

    setResponses((prev) => [{
      prompt: userQuestion,
      response: cleanedResponse,
      image: `data:image/jpeg;base64,${base64}`,
      nasaImage: discoveryData.historicalImage,
      vlmId: visualId,
      coords: discoveryData.coords,
    }, ...prev]);
  };

  const handleChatOnly = async (text) => {
    setLoadingStage('Thinking...');
    const aiText = await chatWithAstroSage(text);
    updateSimulationFromAI(aiText, 'GALAXY');
    setResponses((prev) => [{ prompt: text, response: aiText }, ...prev]);
  };

  if (!authChecked) {
    return (
      <div className="App" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)'}}>
        <div style={{ textAlign: 'center', color: '#818cf8' }}>
          <div className="spinner" style={{width: '50px', height: '50px', border: '4px solid rgba(129, 140, 248, 0.1)', borderTop: '4px solid #818cf8', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px'}}></div>
          <p>Loading AstroVision...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && showSignIn) {
    return (
      <div className="App">
        <SignIn onClose={() => {}} onSignIn={handleSignIn} />
      </div>
    );
  }

  return (
    <div className="App">
        <SpaceBackground/>
      <header className="app-header">
        <div className="header-top">
          <div className="nav-menu">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="nav-button menu-button"
              aria-label="Menu"
            >
              ☰
            </button>
<br></br><br></br>
            <h1 className="header-title"> AstroVision</h1>

            <button onClick={() => setActiveTab('home')} className={`nav-button desktop-nav-btn ${activeTab === 'home' ? 'active' : ''}`}> Observation</button>
            <button onClick={() => setActiveTab('avdao')} className={`nav-button desktop-nav-btn ${activeTab === 'avdao' ? 'active' : ''}`}> Community</button>
            <button onClick={() => setActiveTab('space')} className={`nav-button desktop-nav-btn ${activeTab === 'space' ? 'active' : ''}`}> Space Lab</button>
            <button onClick={() => setActiveTab('playground')} className={`nav-button desktop-nav-btn ${activeTab === 'playground' ? 'active' : ''}`}> Playground</button>
            <button onClick={() => setActiveTab('mars')} className={`nav-button desktop-nav-btn ${activeTab === 'mars' ? 'active' : ''}`}> Mars</button>
          </div>
        </div>
      </header>

      {showMenu && (
        <>
          <div 
            onClick={() => setShowMenu(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 9998
            }}
          />
          <div className="dropdown-menu">
            {isAuthenticated && currentUser && (
              <>
                <div className="menu-user">
                  <button
                    onClick={() => openProfile()}
                    className="menu-item"
                  >
                    <img src={currentUser.avatar} alt="avatar" />
                    <span>{currentUser.username}</span>
                  </button>
                </div>
                <div className="menu-divider" />
              </>
            )}

            <button onClick={() => handleTabChange('home')} className={`menu-item ${activeTab === 'home' ? 'active' : ''}`}>
              <span></span> Observation
            </button>
            <button onClick={() => handleTabChange('avdao')} className={`menu-item ${activeTab === 'avdao' ? 'active' : ''}`}>
              <span></span> Community
            </button>
            <button onClick={() => handleTabChange('space')} className={`menu-item ${activeTab === 'space' ? 'active' : ''}`}>
              <span></span> Space Lab
            </button>
            <button onClick={() => handleTabChange('playground')} className={`menu-item ${activeTab === 'playground' ? 'active' : ''}`}>
              <span></span> Playground
            </button>
            <button onClick={() => handleTabChange('mars')} className={`menu-item ${activeTab === 'mars' ? 'active' : ''}`}>
              <span></span> Mars
            </button>

            {isAuthenticated && (
              <>
                <div className="menu-divider" />
                <button onClick={handleSignOut} className="menu-item danger">
                  <span></span> Sign Out
                </button>
              </>
            )}
          </div>
        </>
      )}

      {activeTab === 'home' && <ObservationTab responses={responses} loading={loading} loadingStage={loadingStage} />}
      {activeTab === 'space' && <SpaceSimulation handTrackingEnabled={handTrackingEnabled} handStatus={handStatus} onToggleHandTracking={toggleHandTracking} selectedShape={selectedShape} shapes={shapes} onShapeChange={changeShape} loading={loading} loadingStage={loadingStage} />}
      {activeTab === 'avdao' && <DAO onViewProfile={openProfile} />}
      {activeTab === 'playground' && <div className="main-content" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}><h2 style={{color: '#818cf8'}}>Playground - Coming Soon</h2></div>}
      {activeTab === 'mars' && <div className="main-content" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}><h2 style={{color: '#ff3366'}}> Mars - Coming Soon</h2></div>}

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

      {showProfile && <Profile profileUserId={viewingUserId} onClose={closeProfile} />}
    </div>
  );
}

export default App;