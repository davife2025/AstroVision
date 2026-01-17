import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const HF_API_KEY = process.env.REACT_APP_HF_API_KEY;
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [responses]);

  // Convert image to base64
  const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  // Analyze image with vision model
  const analyzeImage = async (imageBase64) => {
    try {
      console.log('🔍 Analyzing image...');
      
      const res = await fetch(
        'https://router.huggingface.co/models/Salesforce/blip-image-captioning-large',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: imageBase64
          })
        }
      );

      const data = await res.json();
      console.log('Vision model response:', data);

      if (data[0]?.generated_text) {
        return data[0].generated_text;
      } else if (data.error) {
        throw new Error(data.error);
      }
      
      throw new Error('Unexpected response from vision model');
    } catch (err) {
      console.error('Image analysis error:', err);
      throw err;
    }
  };

  // Get detailed explanation from AstroSage
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

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Process image + text
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

      // If image is selected, analyze it first
      if (selectedImage) {
        const imageBase64 = await imageToBase64(selectedImage);
        imageDescription = await analyzeImage(imageBase64);
        
        console.log('Image description:', imageDescription);

        // Get detailed analysis from AstroSage
        finalResponse = await getAstroSageAnalysis(imageDescription, prompt);
      } else {
        // Just text prompt
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

      // Reset
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

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ 
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        padding: '20px',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1>🌟 AstroVision</h1>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
          Upload astronomical images for AI-powered analysis
        </p>
      </header>

      <main style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '20px', 
        backgroundColor: '#f5f5f5' 
      }}>
        {responses.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            color: '#666'
          }}>
            <p style={{ fontSize: '18px', marginBottom: '10px' }}>
              📸 Upload an image of stars, galaxies, or celestial objects
            </p>
            <p>I'll identify and explain what's in the image!</p>
          </div>
        )}

        {responses.map((item, idx) => (
          <div key={idx} style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '2px solid #667eea',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#667eea' }}>You:</strong> {item.prompt}
            </div>

            {item.image && (
              <div style={{ margin: '15px 0' }}>
                <img 
                  src={item.image} 
                  alt="Uploaded astronomical object" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '300px',
                    borderRadius: '8px',
                    border: '1px solid #ddd'
                  }} 
                />
                {item.imageDescription && (
                  <p style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    fontStyle: 'italic',
                    marginTop: '5px'
                  }}>
                    Vision Model: {item.imageDescription}
                  </p>
                )}
              </div>
            )}

            <div style={{ 
              whiteSpace: 'pre-wrap', 
              marginTop: '10px',
              lineHeight: '1.6'
            }}>
              <strong style={{ color: '#667eea' }}>🌟 AstroSage:</strong>
              <p style={{ marginTop: '8px' }}>{item.response}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef}></div>
      </main>

      <div style={{ 
        padding: '15px', 
        borderTop: '1px solid #ddd', 
        backgroundColor: 'white' 
      }}>
        {/* Image preview */}
        {imagePreview && (
          <div style={{ 
            marginBottom: '10px',
            position: 'relative',
            display: 'inline-block'
          }}>
            <img 
              src={imagePreview} 
              alt="Preview" 
              style={{ 
                maxHeight: '100px',
                borderRadius: '8px',
                border: '2px solid #667eea'
              }} 
            />
            <button
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#f44',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Input area */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            style={{
              padding: '10px 15px',
              fontSize: '16px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
            title="Upload image"
          >
            📷
          </button>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Optional: Ask a specific question about the image..."
            rows="2"
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '16px',
              borderRadius: '10px',
              border: '2px solid #667eea',
              resize: 'none',
              fontFamily: 'inherit'
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                generateResponse();
              }
            }}
          />
          
          <button
            onClick={generateResponse}
            disabled={loading || (!selectedImage && !prompt.trim())}
            style={{
              padding: '10px 20px',
              fontSize: '18px',
              backgroundColor: loading ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: loading || (!selectedImage && !prompt.trim()) ? 'not-allowed' : 'pointer',
              minWidth: '60px'
            }}
          >
            {loading ? '⏳' : '🚀'}
          </button>
        </div>

        <p style={{ 
          fontSize: '12px', 
          color: '#666', 
          marginTop: '8px',
          marginBottom: '0'
        }}>
          💡 Tip: Upload an image of stars/galaxies, or just ask a question. Ctrl+Enter to send.
        </p>
      </div>

      {error && (
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#fee',
          border: '2px solid #fcc',
          color: '#c00',
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: '8px',
          maxWidth: '80%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}>
          {error}
          <button
            onClick={() => setError('')}
            style={{
              marginLeft: '15px',
              background: 'transparent',
              border: 'none',
              color: '#c00',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default App;