import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState([]); // keep history
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const HF_API_KEY = process.env.REACT_APP_HF_API_KEY;
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom when new response arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [responses]);

  const generateResponse = async () => {
    if (!HF_API_KEY) {
      setError('❌ API key not found.');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a question');
      return;
    }

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
            prompt: prompt,
            max_tokens: 300,
            temperature: 0.7,
            top_p: 0.9
          })
        }
      );

      const text = await res.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        setError('Invalid JSON response');
        setLoading(false);
        return;
      }

      let newResponse = '';
      if (!res.ok) {
        setError(data?.error?.message || data?.error || `HTTP Error ${res.status}`);
      } else if (data.choices?.[0]?.message?.content) {
        newResponse = data.choices[0].message.content.trim();
      } else if (data.choices?.[0]?.text) {
        newResponse = data.choices[0].text.trim();
      } else {
        console.log('Unexpected format:', data);
        setError('Unexpected response format. Check console.');
      }

      if (newResponse) {
        setResponses(prev => [...prev, { prompt, response: newResponse }]);
      }
      setPrompt('');
    } catch (err) {
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
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#f5f5f5' }}>
        {responses.map((item, idx) => (
          <div key={idx} style={{
            marginBottom: '15px',
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '2px solid #667eea'
          }}>
            <p><strong>You:</strong> {item.prompt}</p>
            <p style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}><strong> Answer:</strong> {item.response}</p>
          </div>
        ))}
        <div ref={chatEndRef}></div>
      </main>

      <div style={{ padding: '15px', display: 'flex', gap: '10px', borderTop: '1px solid #ddd', backgroundColor: 'white' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask me anything..."
          rows="2"
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '16px',
            borderRadius: '10px',
            border: '2px solid #667eea',
            resize: 'none'
          }}
        />
        <button
          onClick={generateResponse}
          disabled={loading || !prompt.trim()}
          style={{
            padding: '0 20px',
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳' : '🚀'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          color: '#c00',
          position: 'absolute',
          bottom: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: '8px'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
