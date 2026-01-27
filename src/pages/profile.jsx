import React, { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = 'http://localhost:3001/api';

function Profile({ profileUserId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', bio: '' });
  
  const currentUserId = useRef(localStorage.getItem('userId') || 'user-' + Math.random().toString(36).substr(2, 9));
  const isOwnProfile = profileUserId === currentUserId.current;

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/users/${profileUserId}`);
      if (!response.ok) throw new Error('Failed to load profile');
      const data = await response.json();
      setProfile(data);
      setEditForm({ username: data.username, bio: data.bio });
    } catch (err) {
      console.error('Profile load error:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [profileUserId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/users/${profileUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      
      if (!response.ok) throw new Error('Failed to update profile');
      
      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setIsEditing(false);
    } catch (err) {
      console.error('Profile update error:', err);
      setError('Failed to update profile');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <p style={{ color: '#fff', fontSize: '18px' }}>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <p>Profile not found</p>
          {onClose && (
            <button onClick={onClose} style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#00ffcc',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

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
      zIndex: 1000,
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        border: '2px solid rgba(0,255,204,0.3)',
        boxShadow: '0 20px 60px rgba(0,255,204,0.2)',
        position: 'relative'
      }}>
        {onClose && (
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
        )}

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img
            src={profile.avatar}
            alt={profile.username}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '4px solid #00ffcc',
              boxShadow: '0 10px 30px rgba(0,255,204,0.3)'
            }}
          />
        </div>

        {isEditing ? (
          <input
            type="text"
            value={editForm.username}
            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '20px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '18px',
              textAlign: 'center',
              fontWeight: 'bold'
            }}
          />
        ) : (
          <h2 style={{
            textAlign: 'center',
            color: '#00ffcc',
            marginBottom: '10px',
            fontSize: '28px'
          }}>
            {profile.username}
          </h2>
        )}

        {isEditing ? (
          <textarea
            value={editForm.bio}
            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
            placeholder="Tell us about yourself..."
            rows="4"
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '20px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        ) : (
          <p style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.7)',
            marginBottom: '30px',
            fontSize: '16px',
            lineHeight: '1.6'
          }}>
            {profile.bio}
          </p>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'rgba(0,255,204,0.1)',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid rgba(0,255,204,0.3)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00ffcc' }}>
              {profile.postsCount || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '5px' }}>
              Posts
            </div>
          </div>
          <div style={{
            background: 'rgba(0,255,204,0.1)',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid rgba(0,255,204,0.3)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00ffcc' }}>
              {profile.commentsCount || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '5px' }}>
              Comments
            </div>
          </div>
          <div style={{
            background: 'rgba(0,255,204,0.1)',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid rgba(0,255,204,0.3)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00ffcc' }}>
              {profile.likesReceived || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '5px' }}>
              Likes
            </div>
          </div>
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: '14px',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: '30px'
        }}>
          Member since {new Date(profile.joinDate).toLocaleDateString()}
        </p>

        {error && (
          <p style={{
            color: '#ff4444',
            textAlign: 'center',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </p>
        )}

        {isOwnProfile && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveProfile}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#00ffcc',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  💾 Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({ username: profile.username, bio: profile.bio });
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0,255,204,0.2)',
                  color: '#00ffcc',
                  border: '1px solid #00ffcc',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;