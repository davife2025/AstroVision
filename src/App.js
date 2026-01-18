import { useState, useRef, useEffect } from 'react';
import './App.css';
import { initThree, createParticles, changeColor, changeSize, handleResize, cleanup } from './pages/space.js';

function App() {
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  
  // Space tab states
  const [selectedShape, setSelectedShape] = useState('heart');
  const [particleColor, setParticleColor] = useState('#00ffcc');
  const [particleSize, setParticleSize] = useState(0.05);

  const HF_API_KEY = process.env.REACT_APP_HF_API_KEY;
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const spaceContainerRef = useRef(null);
  const threeInitialized = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [responses]);

  // Initialize Three.js when Space tab is active
  useEffect(() => {
    if (activeTab === 'space' && !threeInitialized.current) {
      setTimeout(() => {
        initThree('space-canvas-container');
        threeInitialized.current = true;
      }, 100);
    }

    // Cleanup when leaving space tab
    return () => {
      if (activeTab !== 'space' && threeInitialized.current) {
        cleanup();
        threeInitialized.current = false;
      }
    };
  }, [activeTab]);

  // Handle window resize for Three.js
  useEffect(() => {
    if (activeTab === 'space' && threeInitialized.current) {
      const handleWindowResize = () => {
        handleResize(spaceContainerRef.current);
      };
      window.addEventListener('resize', handleWindowResize);
      return () => window.removeEventListener('resize', handleWindowResize);
    }
  }, [activeTab]);

  const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const analyzeImage = async (imageDataUrl) => {
    const base64 = imageDataUrl.split(",")[1];

    const res = await fetch("http://localhost:3001/analyze-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64 }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    return data[0]?.generated_text || "No description detected.";
  };

  const getAstroSageAnalysis = async (imageDescription, userQuestion) => {
    try {
      console.log('🌟 Getting AstroSage analysis...');
      
      const enhancedPrompt = `Based on this astronomical image description: "${imageDescription}". ${userQuestion || 'Please identify and explain the types of stars, galaxies, and celestial objects visible in this image.'}`;

      const res = await fetch(
        "https://router.huggingface.co/featherless-ai/v1/completions",
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: "AstroMLab/AstroSage-8B",
            prompt: enhancedPrompt,
            max_tokens: 500,
            temperature: 0.7,
            top_p: 0.9
          })
        }
      );

      const text = await res.text();
      const data = JSON.parse(text);

      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      } else if (data.choices?.[0]?.text) {
        return data.choices[0].text.trim();
      } else if (data.error) {
        throw new Error(data.error.message || data.error);
      }
      
      throw new Error('Unexpected response from AstroSage');
    } catch (err) {
      console.error('AstroSage error:', err);
      throw err;
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateResponse = async () => {
    if (!HF_API_KEY) {
      setError('❌ API key not found.');
      return;
    }

    if (!selectedImage && !prompt.trim()) {
      setError('Please provide an image or enter a question');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let finalResponse = '';
      let imageDescription = '';

      if (selectedImage) {
        const imageBase64 = await imageToBase64(selectedImage);
        imageDescription = await analyzeImage(imageBase64);
        
        console.log('Image description:', imageDescription);

        finalResponse = await getAstroSageAnalysis(imageDescription, prompt);
      } else {
        const res = await fetch(
          "https://router.huggingface.co/featherless-ai/v1/completions",
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HF_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: "AstroMLab/AstroSage-8B",
              prompt: prompt,
              max_tokens: 300,
              temperature: 0.7,
              top_p: 0.9
            })
          }
        );

        const text = await res.text();
        const data = JSON.parse(text);

        if (data.choices?.[0]?.message?.content) {
          finalResponse = data.choices[0].message.content.trim();
        } else if (data.choices?.[0]?.text) {
          finalResponse = data.choices[0].text.trim();
        } else if (data.error) {
          throw new Error(data.error.message || data.error);
        }
      }

      if (finalResponse) {
        setResponses(prev => [...prev, {
          prompt: prompt || 'Analyze this astronomical image',
          response: finalResponse,
          image: imagePreview,
          imageDescription: imageDescription
        }]);
      }

      setPrompt('');
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error:', err);
      setError(`Error: ${err.message}`);
    }

    setLoading(false);
  };

  // Space tab handlers
  const handleShapeChange = (shape) => {
    setSelectedShape(shape);
    createParticles(shape);
  };

  const handleColorChange = (e) => {
    const color = e.target.value;
    setParticleColor(color);
    changeColor(color);
  };

  const handleSizeChange = (e) => {
    const size = parseFloat(e.target.value);
    setParticleSize(size);
    changeSize(size);
  };

  const renderHomeContent = () => (
    <>
      <main className="main-content home">
        {responses.length === 0 && (
          <div className="empty-state">
            <p className="empty-state-title">
              📸 Upload an image of stars, galaxies, or celestial objects
            </p>
            <p>I'll identify and explain what's in the image!</p>
          </div>
        )}

        {responses.map((item, idx) => (
          <div key={idx} className="response-card">
            <div className="response-header">
              <span className="response-label">You:</span> {item.prompt}
            </div>

            {item.image && (
              <div className="response-image-container">
                <img 
                  src={item.image} 
                  alt="Uploaded astronomical object" 
                  className="response-image"
                />
                {item.imageDescription && (
                  <p className="response-image-description">
                    Vision Model: {item.imageDescription}
                  </p>
                )}
              </div>
            )}

            <div className="response-text">
              <strong className="response-label">🌟 AstroSage:</strong>
              <p style={{ marginTop: '8px' }}>{item.response}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef}></div>
      </main>

      <div className="input-area">
        {imagePreview && (
          <div className="image-preview-container">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="image-preview"
            />
            <button
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="remove-image-button"
            >
              ×
            </button>
          </div>
        )}

        <div className="input-controls">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageChange}
            className="file-input"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="upload-button"
            title="Upload image"
          >
            📷
          </button>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Optional: Ask a specific question about the image..."
            rows="2"
            className="prompt-textarea"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                generateResponse();
              }
            }}
          />
          
          <button
            onClick={generateResponse}
            disabled={loading || (!selectedImage && !prompt.trim())}
            className="submit-button"
          >
            {loading ? '⏳' : '🚀'}
          </button>
        </div>

        <p className="input-hint">
          💡 Tip: Upload an image of stars/galaxies, or just ask a question. Ctrl+Enter to send.
        </p>
      </div>
    </>
  );

  const renderSpaceContent = () => (
    <main className="main-content space">
      <div className="space-container">
        <h2 className="space-title">🌌 3D Particle Universe</h2>
        <p className="space-description">
          Explore interactive 3D particle shapes. Choose different formations and customize colors!
        </p>
        
        {/* Three.js Canvas Container */}
        <div 
          id="space-canvas-container" 
          ref={spaceContainerRef}
          className="space-canvas"
        ></div>

        {/* Controls */}
        <div className="space-controls">
          <div className="control-group">
            <label>Shape:</label>
            <div className="shape-buttons">
              {['heart', 'flower', 'saturn', 'fireworks', 'galaxy', 'sphere'].map((shape) => (
                <button
                  key={shape}
                  onClick={() => handleShapeChange(shape)}
                  className={`shape-button ${selectedShape === shape ? 'active' : ''}`}
                >
                  {shape.charAt(0).toUpperCase() + shape.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>Color:</label>
            <input 
              type="color" 
              value={particleColor}
              onChange={handleColorChange}
              className="color-picker"
            />
          </div>

          <div className="control-group">
            <label>Size: {particleSize.toFixed(2)}</label>
            <input 
              type="range" 
              min="0.01" 
              max="0.2" 
              step="0.01"
              value={particleSize}
              onChange={handleSizeChange}
              className="size-slider"
            />
          </div>
        </div>
      </div>
    </main>
  );

  const renderClassroomContent = () => (
    <main className="main-content classroom">
      <div className="classroom-container">
        <h2 className="classroom-title">🎓 Astronomy Classroom</h2>
        <p className="classroom-description">
          Learn astronomy through interactive lessons, quizzes, and educational resources.
        </p>
        
        <div className="classroom-grid">
          {[
            { title: '📚 Lesson 1: Introduction to Astronomy', desc: 'Learn the basics of astronomical observation' },
            { title: '🔬 Lesson 2: Stellar Evolution', desc: 'Discover how stars are born, live, and die' },
            { title: '🌠 Lesson 3: Galaxy Classification', desc: 'Understand different types of galaxies' },
            { title: '📝 Quiz: Test Your Knowledge', desc: 'Challenge yourself with astronomy questions' },
          ].map((lesson, idx) => (
            <div key={idx} className="lesson-card">
              <h3 className="lesson-card-title">{lesson.title}</h3>
              <p className="lesson-card-description">{lesson.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'home':
        return renderHomeContent();
      case 'space':
        return renderSpaceContent();
      case 'classroom':
        return renderClassroomContent();
      default:
        return renderHomeContent();
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-top">
          <h1 className="header-title">🌟 AstroVision</h1>
          <p className="header-subtitle">
            AI-Powered Astronomical Image Analysis
          </p>
        </div>

        <nav className="nav-menu">
          {[
            { id: 'home', label: 'Home', icon: '🏠' },
            { id: 'space', label: 'Space', icon: '🚀' },
            { id: 'classroom', label: 'Classroom', icon: '🎓' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="nav-button-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {renderContent()}

      {error && (
        <div className="error-notification">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="error-close-button"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default App;