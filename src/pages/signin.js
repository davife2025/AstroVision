import React, { useState, useEffect } from 'react';

function SignIn({ onClose, onSignIn }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    // Check if wallet already connected
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        });
    }
  }, []);

  const connectTwitter = () => {
    setIsConnecting(true);
    setError('');
    
    // In production, this would redirect to your backend OAuth endpoint
    // For now, we'll simulate it
    const TWITTER_CLIENT_ID = process.env.REACT_APP_TWITTER_CLIENT_ID;
    
    if (!TWITTER_CLIENT_ID) {
      // Simulate Twitter login for development
      setTimeout(() => {
        const mockUser = {
          id: 'twitter-' + Math.random().toString(36).substr(2, 9),
          username: 'User_' + Math.random().toString(36).substr(2, 5),
          method: 'twitter',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`
        };
        localStorage.setItem('userId', mockUser.id);
        localStorage.setItem('userAuth', JSON.stringify(mockUser));
        onSignIn(mockUser);
        setIsConnecting(false);
      }, 1500);
      return;
    }

    // Production Twitter OAuth flow
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/twitter/callback');
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('twitter_oauth_state', state);
    
    const authUrl = `https://twitter.com/i/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${TWITTER_CLIENT_ID}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=tweet.read users.read&` +
      `state=${state}&` +
      `code_challenge=challenge&` +
      `code_challenge_method=plain`;
    
    window.location.href = authUrl;
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError('');

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        setError('Please install MetaMask or another Web3 wallet');
        setIsConnecting(false);
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts.length === 0) {
        setError('No accounts found');
        setIsConnecting(false);
        return;
      }

      const address = accounts[0];
      setWalletAddress(address);

      // Create user from wallet
      const walletUser = {
        id: 'wallet-' + address.substring(0, 10),
        username: 'Astronaut_' + address.substring(2, 8),
        method: 'wallet',
        walletAddress: address,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`
      };

      localStorage.setItem('userId', walletUser.id);
      localStorage.setItem('userAuth', JSON.stringify(walletUser));
      onSignIn(walletUser);
      setIsConnecting(false);
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
      setIsConnecting(false);
    }
  };

  const continueAsGuest = () => {
    const guestUser = {
      id: 'guest-' + Math.random().toString(36).substr(2, 9),
      username: 'Guest_' + Math.random().toString(36).substr(2, 5),
      method: 'guest',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`
    };
    localStorage.setItem('userId', guestUser.id);
    localStorage.setItem('userAuth', JSON.stringify(guestUser));
    onSignIn(guestUser);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '450px',
        width: '100%',
        border: '2px solid rgba(0,255,204,0.3)',
        boxShadow: '0 20px 60px rgba(0,255,204,0.2)',
        position: 'relative',
        animation: 'slideUp 0.4s ease-out'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            fontSize: '24px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{
            fontSize: '28px',
            color: '#00ffcc',
            marginBottom: '10px'
          }}>
            🌟 Welcome to AstroVision
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '14px'
          }}>
            Sign in to save your discoveries and join the community
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: 'rgba(255,68,68,0.1)',
            border: '1px solid rgba(255,68,68,0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#ff4444',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Sign In Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* Twitter Sign In */}
          <button
            onClick={connectTwitter}
            disabled={isConnecting}
            style={{
              width: '100%',
              padding: '16px',
              background: '#1DA1F2',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s',
              opacity: isConnecting ? 0.6 : 1
            }}
            onMouseEnter={(e) => !isConnecting && (e.target.style.background = '#1a8cd8')}
            onMouseLeave={(e) => !isConnecting && (e.target.style.background = '#1DA1F2')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
            {isConnecting ? 'Connecting...' : 'Continue with Twitter'}
          </button>

          {/* Wallet Connect */}
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s',
              opacity: isConnecting ? 0.6 : 1
            }}
            onMouseEnter={(e) => !isConnecting && (e.target.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => !isConnecting && (e.target.style.transform = 'scale(1)')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="7" width="18" height="12" rx="2"/>
              <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/>
              <circle cx="12" cy="13" r="1"/>
            </svg>
            {walletAddress 
              ? `Connected: ${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`
              : isConnecting ? 'Connecting...' : 'Connect Crypto Wallet'
            }
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: '10px 0'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Guest Access */}
          <button
            onClick={continueAsGuest}
            style={{
              width: '100%',
              padding: '16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
          >
            Continue as Guest
          </button>
        </div>

        {/* Info Text */}
        <p style={{
          marginTop: '20px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'center',
          lineHeight: '1.5'
        }}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

export default SignIn;