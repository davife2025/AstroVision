import { React, useState } from 'react';
import './App.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);


  const generateResponse = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json();
      setResponse(data.response);
    } catch (error) {
      console.error('Error:', error);
      setResponse('Error: Could not connect to server');
    }
    setLoading(false);
  };

  return (
    <div className="App">
       <main style={{ padding: '20px' }}> 
        <h1>AstroVision</h1>
          {response && (
          <div className="response" style={{ 
            marginTop: '20px', 
            padding: '15px', 
            border: '1px solid #ccc',
            borderRadius: '10px' 
          }}>
            {response}
          </div>
        )}
        <textarea 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt..."
          rows="5"
          style={{ width: '70%', padding: '10px' }}
        />
        <br></br><br></br>
        <button 
          onClick={generateResponse} 
          disabled={loading}
          style={{ marginTop: '10px', padding: '10px 20px' }}
        >
          
          {loading ? 'Generating...' : 'Generate'}
        </button>
      
      </main>
    </div>
  );
}

export default App;