import React, { useState, useRef, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api';

function DAO({ onViewProfile }) {
  const [communityPosts, setCommunityPosts] = useState([]);
  const [daoPostText, setDaoPostText] = useState('');
  const [daoPostImage, setDaoPostImage] = useState(null);
  const [daoImagePreview, setDaoImagePreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Comment states
  const [commentTexts, setCommentTexts] = useState({});
  const [showComments, setShowComments] = useState({});
  const [postComments, setPostComments] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  
  // NEW: Nested comment states
  const [replyingTo, setReplyingTo] = useState({});
  const [replyTexts, setReplyTexts] = useState({});
  
  const daoFileInputRef = useRef(null);
  const userId = useRef(localStorage.getItem('userId') || 'user-' + Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    localStorage.setItem('userId', userId.current);
  }, []);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const response = await fetch(`${API_URL}/posts`);
      if (!response.ok) throw new Error('Failed to load posts');
      const posts = await response.json();
      setCommunityPosts(posts);
    } catch (error) {
      console.error('Load error:', error);
      setError('Failed to load posts');
      setTimeout(() => setError(''), 3000);
    }
  };

  const loadComments = async (postId) => {
    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      const response = await fetch(`${API_URL}/posts/${postId}/comments`);
      if (!response.ok) throw new Error('Failed to load comments');
      const comments = await response.json();
      setPostComments(prev => ({ ...prev, [postId]: comments }));
    } catch (error) {
      console.error('Load comments error:', error);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleComments = async (postId) => {
    const isCurrentlyShown = showComments[postId];
    setShowComments(prev => ({ ...prev, [postId]: !isCurrentlyShown }));
    
    if (!isCurrentlyShown && !postComments[postId]) {
      await loadComments(postId);
    }
  };

  const handleDaoImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be smaller than 5MB');
        setTimeout(() => setError(''), 3000);
        return;
      }
      setDaoPostImage(file);
      setDaoImagePreview(URL.createObjectURL(file));
    }
  };

  const createCommunityPost = async () => {
    if (!daoPostText.trim() && !daoPostImage) {
      setError('Add text or image to post');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    try {
      let imageBase64 = null;

      if (daoPostImage) {
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(daoPostImage);
        });
      }

      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: daoPostText,
          image: imageBase64,
          userId: userId.current  // FIXED: Added userId
        })
      });

      if (!response.ok) throw new Error('Failed to create post');

      const newPost = await response.json();
      setCommunityPosts(prev => [newPost, ...prev]);

      setDaoPostText('');
      setDaoPostImage(null);
      setDaoImagePreview(null);
      if (daoFileInputRef.current) daoFileInputRef.current.value = '';
      setError('');
    } catch (error) {
      console.error('Post creation error:', error);
      setError('Failed to create post');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // UPDATED: Now supports nested comments via parentId
  const createComment = async (postId, parentId = null) => {
    const text = parentId ? replyTexts[parentId] : commentTexts[postId];
    
    if (!text || !text.trim()) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          userId: userId.current,
          parentId: parentId
        })
      });

      if (!response.ok) throw new Error('Failed to create comment');

      // Reload comments to get updated nested structure
      await loadComments(postId);
      
      // Clear input
      if (parentId) {
        setReplyTexts(prev => ({ ...prev, [parentId]: '' }));
        setReplyingTo(prev => ({ ...prev, [parentId]: false }));
      } else {
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      }
    } catch (error) {
      console.error('Comment creation error:', error);
    }
  };

  const toggleLike = async (postId) => {
    try {
      const response = await fetch(`${API_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId.current })
      });

      if (!response.ok) throw new Error('Failed to like post');

      const updatedPost = await response.json();
      setCommunityPosts(prev => 
        prev.map(p => p.id === postId ? updatedPost : p)
      );
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const toggleCommentLike = async (postId, commentId) => {
    try {
      const response = await fetch(`${API_URL}/posts/${postId}/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId.current })
      });

      if (!response.ok) throw new Error('Failed to like comment');

      // Reload comments to get updated like status
      await loadComments(postId);
    } catch (error) {
      console.error('Comment like error:', error);
    }
  };

  // NEW: Recursive comment renderer for nested comments
  const renderComment = (comment, postId, depth = 0) => {
    const marginLeft = depth * 20;
    
    return (
      <div key={comment.id}>
        <div 
          style={{
            background: 'rgba(0,0,0,0.2)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '10px',
            marginLeft: `${marginLeft}px`,
            borderLeft: depth > 0 ? '2px solid rgba(0,255,204,0.3)' : 'none'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '13px',
            opacity: 0.7
          }}>
            <span 
              onClick={() => onViewProfile && onViewProfile(comment.userId)}
              style={{ 
                fontWeight: 'bold', 
                color: '#00ffcc',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {comment.author}
            </span>
            <span>{comment.timeString}</span>
          </div>
          <p style={{ marginBottom: '8px', fontSize: '14px' }}>
            {comment.text}
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => toggleCommentLike(postId, comment.id)}
              style={{
                padding: '4px 12px',
                background: comment.likedBy?.includes(userId.current)
                  ? 'rgba(255,100,100,0.3)'
                  : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {comment.likedBy?.includes(userId.current) ? '❤️' : '🤍'} {comment.likes}
            </button>
            <button
              onClick={() => setReplyingTo(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
              style={{
                padding: '4px 12px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
               Reply
            </button>
          </div>
          
          {replyingTo[comment.id] && (
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={replyTexts[comment.id] || ''}
                onChange={(e) => setReplyTexts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                placeholder={`Reply to ${comment.author}...`}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    createComment(postId, comment.id);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '20px',
                  color: '#fff',
                  fontSize: '13px'
                }}
              />
              <button
                onClick={() => createComment(postId, comment.id)}
                disabled={!replyTexts[comment.id]?.trim()}
                style={{
                  padding: '6px 14px',
                  background: !replyTexts[comment.id]?.trim() ? '#555' : '#00ffcc',
                  color: !replyTexts[comment.id]?.trim() ? '#888' : '#000',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: !replyTexts[comment.id]?.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold'
                }}
              >
                Send
              </button>
            </div>
          )}
        </div>
        
        {comment.replies && comment.replies.length > 0 && (
          <div>
            {comment.replies.map(reply => renderComment(reply, postId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="main-content dao">
      <div className="dao-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <h2 className="dao-title" style={{ textAlign: 'center', marginBottom: '10px' }}>
           Community 
        </h2>
        <p style={{ textAlign: 'center', marginBottom: '30px', opacity: 0.8 }}>
          Share your astronomical discoveries with the community
        </p>

        {/* Create Post Section */}
        <div className="create-post" style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '30px'
        }}>
          <h3 style={{ marginBottom: '15px' }}> Share Discovery</h3>
          
          {daoImagePreview && (
            <div style={{ marginBottom: '15px', position: 'relative' }}>
              <img 
                src={daoImagePreview} 
                alt="Preview" 
                style={{ 
                  width: '100%', 
                  maxHeight: '300px', 
                  objectFit: 'contain',
                  borderRadius: '8px',
                  background: '#000'
                }} 
              />
              <button
                onClick={() => {
                  setDaoPostImage(null);
                  setDaoImagePreview(null);
                  if (daoFileInputRef.current) daoFileInputRef.current.value = '';
                }}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: '#ff4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                ×
              </button>
            </div>
          )}

          <textarea
            value={daoPostText}
            onChange={(e) => setDaoPostText(e.target.value)}
            placeholder="Describe your discovery, observation, or astronomical insight..."
            rows="4"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              marginBottom: '15px',
              resize: 'vertical'
            }}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="file"
              ref={daoFileInputRef}
              accept="image/*"
              onChange={handleDaoImageChange}
              disabled={loading}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => daoFileInputRef.current?.click()}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: loading ? 0.5 : 1
              }}
            >
               Add Image
            </button>
            <button
              onClick={createCommunityPost}
              disabled={loading || (!daoPostText.trim() && !daoPostImage)}
              style={{
                padding: '10px 20px',
                background: (loading || (!daoPostText.trim() && !daoPostImage)) ? '#555' : '#00ffcc',
                color: (loading || (!daoPostText.trim() && !daoPostImage)) ? '#888' : '#000',
                border: 'none',
                borderRadius: '8px',
                cursor: (loading || (!daoPostText.trim() && !daoPostImage)) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                flex: 1
              }}
            >
              {loading ? ' Posting...' : 'Post Discovery'}
            </button>
          </div>

          {error && (
            <p style={{ color: '#ff4444', marginTop: '10px', fontSize: '14px' }}>
              {error}
            </p>
          )}
        </div>

        {/* Community Posts Feed */}
        <div className="community-feed">
          <h3 style={{ marginBottom: '20px' }}>
            🔭 Community Discoveries ({communityPosts.length})
          </h3>
          
          {communityPosts.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              opacity: 0.6
            }}>
              <p>No discoveries yet. Be the first to share!</p>
            </div>
          )}

          {communityPosts.map((post) => (
            <div 
              key={post.id} 
              className="community-post"
              style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '15px',
                fontSize: '14px',
                opacity: 0.8
              }}>
                <span 
                  onClick={() => onViewProfile && onViewProfile(post.userId)}
                  style={{ 
                    fontWeight: 'bold', 
                    color: '#00ffcc',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  🌟 {post.author}
                </span>
                <span>{post.timeString}</span>
              </div>

              {post.image && (
                <img 
                  src={post.image} 
                  alt="Discovery" 
                  style={{
                    width: '100%',
                    maxHeight: '400px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    background: '#000'
                  }}
                />
              )}

              {post.text && (
                <p style={{
                  marginBottom: '15px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {post.text}
                </p>
              )}

              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '15px',
                paddingTop: '15px',
                borderTop: '1px solid rgba(255,255,255,0.1)'
              }}>
                <button
                  onClick={() => toggleLike(post.id)}
                  style={{
                    padding: '8px 16px',
                    background: post.likedBy?.includes(userId.current) 
                      ? 'rgba(255,100,100,0.3)' 
                      : 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '20px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  {post.likedBy?.includes(userId.current) ? '❤️' : '🤍'} {post.likes}
                </button>

                <button
                  onClick={() => toggleComments(post.id)}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '20px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  💬 {post.comments?.length || 0}
                </button>
              </div>

              {showComments[post.id] && (
                <div style={{
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={commentTexts[post.id] || ''}
                      onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="Add a comment..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          createComment(post.id);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '20px',
                        color: '#fff',
                        fontSize: '14px'
                      }}
                    />
                    <button
                      onClick={() => createComment(post.id)}
                      disabled={!commentTexts[post.id]?.trim()}
                      style={{
                        padding: '8px 16px',
                        background: !commentTexts[post.id]?.trim() ? '#555' : '#00ffcc',
                        color: !commentTexts[post.id]?.trim() ? '#888' : '#000',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: !commentTexts[post.id]?.trim() ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      Send
                    </button>
                  </div>

                  {loadingComments[post.id] ? (
                    <p style={{ textAlign: 'center', opacity: 0.6 }}>Loading comments...</p>
                  ) : (
                    <div>
                      {(postComments[post.id] || []).map(comment => renderComment(comment, post.id))}
                      {(postComments[post.id] || []).length === 0 && (
                        <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '14px' }}>
                          No comments yet. Be the first to comment!
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default DAO;