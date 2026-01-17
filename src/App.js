import { useState } from 'react';
import './App.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const HF_API_KEY = process.env.REACT_APP_HF_API_KEY;

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
    setResponse('');

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

      if (!res.ok) {
        setError(data?.error?.message || data?.error || `HTTP Error ${res.status}`);
      } 
      // ✅ FIXED RESPONSE HANDLING
      else if (data.choices?.[0]?.message?.content) {
        setResponse(data.choices[0].message.content.trim());
      } else if (data.choices?.[0]?.text) {
        setResponse(data.choices[0].text.trim());
      } else {
        console.log('Unexpected format:', data);
        setError('Unexpected response format. Check console.');
      }

    } catch (err) {
      setError(`Error: ${err.message}`);
    }

    setLoading(false);
  };

  return (
    <div className="App" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ 
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        padding: '40px 20px',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1>🌟AstroVision </h1>
        <p>Ask me anything!</p>
      </header>
  {response && (
          <div style={{
            marginTop: '30px',
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '2px solid #667eea'
          }}>
            <h3>✨ Response</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{response}</p>
          </div>
        )}
      <main style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask me anything..."
          rows="4"
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '16px',
            borderRadius: '12px',
            border: '2px solid #667eea'
          }}
        />

        <button
          onClick={generateResponse}
          disabled={loading || !prompt.trim()}
          style={{
            padding: '15px',
            fontSize: '18px',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            width: '100%',
            marginTop: '15px',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? '⏳ Generating...' : '🚀 Generate'}
        </button>

        {error && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c00'
          }}>
            {error}
          </div>
        )}

      
      </main>
    </div>
  );
}

export default App;
