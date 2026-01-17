import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]); // {prompt, response, imageUrl}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const HF_API_KEY = process.env.REACT_APP_HF_API_KEY;
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Send text prompt to AstroSage LLM
  const sendTextPrompt = async (text) => {
    if (!text.trim() || !HF_API_KEY) return;
    setLoading(true);
    setError('');

    try {
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
            prompt: text,
            max_tokens: 300,
            temperature: 0.7,
            top_p: 0.9
          })
        }
      );

      const textData = await res.text();
      let data;
      try { data = JSON.parse(textData); } catch { setError('Invalid JSON'); setLoading(false); return; }

      let responseText = '';
      if (data.choices?.[0]?.message?.content) responseText = data.choices[0].message.content.trim();
      else if (data.choices?.[0]?.text) responseText = data.choices[0].text.trim();
      else setError('Unexpected response format');

      if (responseText) {
        setChatHistory(prev => [...prev, { prompt: text, response: responseText, imageUrl: null }]);
      }
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  // Handle image upload + captioning + LLM
  const handleImageUpload = async (file) => {
    if (!file || !HF_API_KEY) return;
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Step 1: Generate caption from image
      const visionRes = await fetch(
        'https://router.huggingface.co/models/Salesforce/blip-image-captioning-base',
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${HF_API_KEY}` },
          body: formData
        }
      );

      const visionData = await visionRes.json();
      const caption = visionData?.generated_text;
      if (!caption) { setError('Could not generate image caption'); setLoading(false); return; }

      // Step 2: Send caption to AstroSage LLM
      const lmmPrompt = `Analyze this astronomical image description and briefly explain the types of stars and galaxies: ${caption}`;
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
            prompt: lmmPrompt,
            max_tokens: 300,
            temperature: 0.7,
            top_p: 0.9
          })
        }
      );

      const textData = await res.text();
      let data;
      try { data = JSON.parse(textData); } catch { setError('Invalid JSON from LLM'); setLoading(false); return; }

      let responseText = '';
      if (data.choices?.[0]?.message?.content) responseText = data.choices[0].message.content.trim();
      else if (data.choices?.[0]?.text) responseText = data.choices[0].text.trim();
      else setError('Unexpected response format');

      if (responseText) {
        const imageUrl = URL.createObjectURL(file); // show the actual uploaded image
        setChatHistory(prev => [...prev, { prompt: 'Image Analysis', response: responseText, imageUrl }]);
      }

    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', padding: '20px', color: 'white', textAlign: 'center' }}>
        <h1>🌟 AstroVision</h1>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#f5f5f5' }}>
        {chatHistory.map((item, idx) => (
          <div key={idx} style={{ marginBottom: '15px', padding: '15px', backgroundColor: 'white', borderRadius: '12px', border: '2px solid #667eea' }}>
            {item.prompt && <p><strong>{item.prompt}:</strong></p>}
            {/* Show uploaded image */}
            {item.imageUrl && (
              <img 
                src={item.imageUrl} 
                alt="Uploaded" 
                style={{ maxWidth: '100%', borderRadius: '10px', margin: '10px 0' }} 
              />
            )}
            {item.response && <p style={{ whiteSpace: 'pre-wrap' }}><strong>Response:</strong> {item.response}</p>}
          </div>
        ))}
        <div ref={chatEndRef}></div>
      </main>

      {/* Input + file upload */}
      <div style={{ padding: '15px', display: 'flex', gap: '10px', borderTop: '1px solid #ddd', backgroundColor: 'white' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask me anything..."
          rows="2"
          style={{ flex: 1, padding: '10px', fontSize: '16px', borderRadius: '10px', border: '2px solid #667eea', resize: 'none' }}
        />
        <button
          onClick={() => { sendTextPrompt(prompt); setPrompt(''); }}
          disabled={loading || !prompt.trim()}
          style={{ padding: '0 20px', fontSize: '16px', backgroundColor: loading ? '#ccc' : '#667eea', color: 'white', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? '⏳' : '🚀'}
        </button>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => { if (e.target.files[0]) handleImageUpload(e.target.files[0]); }}
          style={{ borderRadius: '10px', padding: '0 10px' }}
        />
      </div>

      {error && (
        <div style={{ padding: '10px', backgroundColor: '#fee', border: '1px solid #fcc', color: '#c00', position: 'absolute', bottom: '70px', left: '50%', transform: 'translateX(-50%)', borderRadius: '8px' }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
