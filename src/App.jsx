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
import Playground from './pages/playground';
import DAODashboard from './components/daoDashboard';


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
  const [playgroundPrompt, setPlaygroundPrompt] = useState(''); // ← ADD HERE
 


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

  try {
    // --- NEW: DIRECT PLAYGROUND ROUTE ---
    if (activeTab === 'playground') {
      if (selectedImage) {
        // Convert the file to a Data URI and send to Playground
        const reader = new FileReader();
        reader.onload = (e) => {
          if (window.loadImageToPlayground) {
            window.loadImageToPlayground(e.target.result);
          }
        };
        reader.readAsDataURL(selectedImage);
      } else if (prompt) {
        window.executeTextMorph(prompt);
      }
      setLoading(false);
      setPrompt("");
      setSelectedImage(null);
      return; // Exit here so it doesn't trigger the AI pipeline
    }

    // --- EXISTING: AI OBSERVATION ROUTE ---
    if (selectedImage) {
      const base64 = await compressImage(selectedImage);
      await handleDiscoveryPipeline(base64, prompt || 'Analyze this celestial object.');
    } else {
      await handleChatOnly(prompt);
    }
  } catch (err) {
    setError(`Pipeline Error: ${err.message}`);
  } finally {
    setLoading(false);
    setPrompt('');
  }
};

  const handleDiscoveryPipeline = async (base64, userQuestion) => {
    const { visualId, discoveryData, aiText } = await runDiscoveryAnalysis(base64, userQuestion, setLoadingStage);
    const cleanedResponse = cleanAIResponse(aiText);
    updateSimulationFromAI(aiText, discoveryData.type);
    
    setResponses((prev) => [...prev, {
  prompt: userQuestion,
  response: cleanedResponse,
  image: `data:image/jpeg;base64,${base64}`,
  nasaImage: discoveryData.historicalImage,
  vlmId: visualId,
  coords: discoveryData.coords,
}]);
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
                    <button onClick={() => setActiveTab('daodashboard')} className={`nav-button desktop-nav-btn ${activeTab === 'daodashboard' ? 'active' : ''}`}>Vote</button>
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
            <button onClick={() => handleTabChange('daodashboard')} className={`menu-item ${activeTab === 'daodashboard' ? 'active' : ''}`}>
              <span></span> Vote
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
      {activeTab === 'daodashboard' && <DAODashboard/>}



















{activeTab === 'playground' && (
  <div style={{ 
    position: 'relative', 
    width: '100%', 
    minHeight: 'calc(100vh - 80px)',
    overflow: 'hidden'
  }}>
    
    {/* HUD Panel - Left Side */}
    <div style={{
      position: 'fixed',
      top: '100px',
      left: '20px',
      width: '280px',
      background: 'transparent',
      backdropFilter: 'blur(15px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '12px',
      padding: '20px',
      zIndex: 9998,
      pointerEvents: 'auto'
    }}>
      <div style={{
        color: '#00ffcc',
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '2px',
        marginBottom: '15px',
        fontFamily: 'Courier New, monospace',
        textShadow: '0 0 10px rgba(0, 255, 204, 0.5)'
      }}>
        NEURAL SENSOR LOG
      </div>
      <div style={{
        color: '#ffffff',
        fontFamily: 'Courier New, monospace',
        fontSize: '13px'
      }}>
        <p style={{ margin: '8px 0', textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)' }}>
          {loadingStage || ">>> SYSTEMS STANDBY"}
        </p>
        {handStatus.handCount > 0 && (
          <p style={{ margin: '8px 0', textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)' }}>
            🔴 PROXIMITY: {handStatus.scale.toFixed(2)}
          </p>
        )}
      </div>
    </div>

    {/* Playground Component - Contained */}
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 140, // Increased space for larger console
      zIndex: 1
    }}>
      <Playground 
        onLoadingStage={setLoadingStage} 
        handStatus={handStatus}
      />
    </div>

    {/* Interactive Console - ALWAYS ON TOP */}
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'transparent',
      backdropFilter: 'blur(25px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.15)',
      padding: '20px',
      zIndex: 99999,
      boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.5)'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Main Input Row */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <input 
            type="text"
            autoFocus
            value={playgroundPrompt} 
            onChange={(e) => {
              console.log("✅ Typing:", e.target.value);
              setPlaygroundPrompt(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && playgroundPrompt.trim()) {
                console.log("✅ Enter pressed");
                if (typeof window.executeTextMorph === 'function') {
                  window.executeTextMorph(playgroundPrompt);
                  setPlaygroundPrompt("");
                }
              }
            }}
            placeholder="COMMENCE TYPING..."
            style={{
              flex: 1,
               background: 'transparent',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              padding: '14px 20px',
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: 'Courier New, monospace',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              transition: 'all 0.3s ease',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(129, 140, 248, 0.8)';
              e.target.style.boxShadow = '0 0 25px rgba(129, 140, 248, 0.4)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.target.style.boxShadow = 'none';
            }}
          />
          
          <button 
            onClick={() => {
              console.log("✅ MORPH clicked with:", playgroundPrompt);
              if (!playgroundPrompt.trim()) {
                setError('Please enter a prompt first');
                setTimeout(() => setError(''), 3000);
                return;
              }
              if (typeof window.executeTextMorph === 'function') {
                window.executeTextMorph(playgroundPrompt);
                setPlaygroundPrompt("");
              } else {
                console.error("executeTextMorph not found");
                setError('Morph function not ready');
                setTimeout(() => setError(''), 3000);
              }
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(129, 140, 248, 0.5)';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 20px rgba(129, 140, 248, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(129, 140, 248, 0.3)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
            style={{
                 background: 'transparent',
              border: '2px solid rgba(129, 140, 248, 0.6)',
              color: '#ffffff',
              padding: '14px 28px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'Courier New, monospace',
              letterSpacing: '1.5px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)'
            }}
          >
            MORPH
          </button>

          <button 
            onClick={() => {
              console.log("✅ SENSOR clicked");
              if (typeof window.activateCameraSensor === 'function') {
                window.activateCameraSensor();
              } else {
                console.error("activateCameraSensor not found");
                setError('Camera sensor not available');
                setTimeout(() => setError(''), 3000);
              }
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.15)';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 20px rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(0, 0, 0, 0.8)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
            style={{
                 background: 'transparent',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              color: '#ffffff',
              padding: '14px 28px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'Courier New, monospace',
              letterSpacing: '1.5px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)'
            }}
          >
            ACTIVATE SENSORS
          </button>
        </div>

        {/* Controls Row - Color, Size, Image Upload */}
        <div style={{
          display: 'flex',
          gap: '15px',
          alignItems: 'center',
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.5)',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {/* Color Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{
              color: '#ffffff',
              fontSize: '12px',
              fontFamily: 'Courier New, monospace',
              letterSpacing: '1px',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)'
            }}>
              COLOR:
            </label>
            <input 
              type="color"
              defaultValue="#00ffcc"
              onChange={(e) => {
                console.log("Color changed:", e.target.value);
                if (typeof window.setTextColor === 'function') {
                  window.setTextColor(e.target.value);
                }
              }}
              style={{
                width: '50px',
                height: '35px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'transparent'
              }}
            />
          </div>

          {/* Size Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <label style={{
              color: '#ffffff',
              fontSize: '12px',
              fontFamily: 'Courier New, monospace',
              letterSpacing: '1px',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
              whiteSpace: 'nowrap'
            }}>
              SIZE:
            </label>
            <input 
              type="range"
              min="10"
              max="200"
              defaultValue="50"
              onChange={(e) => {
                console.log("Size changed:", e.target.value);
                if (typeof window.setTextSize === 'function') {
                  window.setTextSize(parseInt(e.target.value));
                }
              }}
              style={{
                flex: 1,
                maxWidth: '200px',
                height: '6px',
                borderRadius: '3px',
                background: 'rgba(255, 255, 255, 0.2)',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Image Upload */}
          <input 
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                console.log("Image selected:", file.name);
                const reader = new FileReader();
                reader.onload = (event) => {
                  const imageDataUrl = event.target.result;
                  console.log("Image loaded");
                  if (typeof window.loadImageToPlayground === 'function') {
                    window.loadImageToPlayground(imageDataUrl);
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
            style={{ display: 'none' }}
            id="playground-image-upload"
          />
          <label 
            htmlFor="playground-image-upload"
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 165, 0, 0.4)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 165, 0, 0.2)';
              e.target.style.transform = 'translateY(0)';
            }}
            style={{
                  background: 'transparent',
              border: '2px solid rgba(255, 165, 0, 0.5)',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '600',
              fontFamily: 'Courier New, monospace',
              letterSpacing: '1px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)'
            }}
          >
            UPLOAD IMAGE
          </label>
        </div>
      </div>
    </div>
  </div>
)}








      
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