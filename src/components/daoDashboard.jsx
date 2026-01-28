// src/components/DAODashboard.jsx - FIXED VERSION

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useDAO } from '../hooks/useDao';

const DAODashboard = () => {
  const { account, connect, disconnect, isConnected, formatAddress } = useWeb3();
  const { 
    userBalance, 
    createProposal, 
    vote, 
    getActiveProposals, // ✅ Changed from getWeeklyTopics
    hasUserVoted,
    loading 
  } = useDAO();

  const [activeTab, setActiveTab] = useState('all');
  const [proposals, setProposals] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // ✅ Added refresh trigger

  const [proposalForm, setProposalForm] = useState({
    type: 0,
    title: '',
    description: '',
    ipfsHash: ''
  });

  // ✅ Load ALL proposals
  useEffect(() => {
    if (isConnected) {
      loadProposals();
    }
  }, [isConnected, activeTab, refreshTrigger]); // ✅ Added refreshTrigger

  const loadProposals = async () => {
    try {
      console.log('📊 Loading proposals...');
      const allProposals = await getActiveProposals(); // ✅ Get all active proposals
      console.log('✅ Loaded proposals:', allProposals);
      
      // Filter by type if needed
      let filtered = allProposals;
      if (activeTab === 'weekly-topics') {
        filtered = allProposals.filter(p => p.proposalType === 2);
      } else if (activeTab === 'discoveries') {
        filtered = allProposals.filter(p => p.proposalType === 1);
      } else if (activeTab === 'knowledge') {
        filtered = allProposals.filter(p => p.proposalType === 4);
      }
      
      setProposals(filtered);
    } catch (error) {
      console.error('❌ Error loading proposals:', error);
    }
  };

  const handleCreateProposal = async (e) => {
    e.preventDefault();
    
    try {
      console.log('📝 Creating proposal...');
      const proposalId = await createProposal(
        proposalForm.type,
        proposalForm.title,
        proposalForm.description,
        proposalForm.ipfsHash || ''
      );
      
      console.log('✅ Proposal created! ID:', proposalId);
      alert(`Proposal created successfully! ID: ${proposalId}`);
      
      // ✅ Close modal and reset form
      setShowCreateModal(false);
      setProposalForm({ type: 0, title: '', description: '', ipfsHash: '' });
      
      // ✅ Trigger reload
      setRefreshTrigger(prev => prev + 1);
      
      // ✅ Also manually reload after a delay
      setTimeout(() => {
        loadProposals();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Create proposal error:', error);
      alert('Failed to create proposal: ' + error.message);
    }
  };

  const handleVote = async (proposalId, support) => {
    try {
      console.log('🗳️ Voting on proposal:', proposalId, 'Support:', support);
      
      // Check if already voted
      const voted = await hasUserVoted(proposalId);
      if (voted) {
        alert('You have already voted on this proposal');
        return;
      }

      // Vote (1 = FOR, 2 = AGAINST)
      await vote(proposalId, support ? 1 : 2);
      alert('Vote submitted successfully!');
      
      // ✅ Trigger reload
      setRefreshTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error('❌ Vote error:', error);
      alert('Failed to vote: ' + error.message);
    }
  };

  const ProposalCard = ({ proposal }) => {
    const totalVotes = parseFloat(proposal.votesFor || 0) + parseFloat(proposal.votesAgainst || 0);
    const forPercentage = totalVotes > 0 
      ? ((parseFloat(proposal.votesFor || 0) / totalVotes) * 100).toFixed(1)
      : 50;

    const getStatusColor = (status) => {
      switch(status) {
        case 0: return '#ffa500'; // PENDING
        case 1: return '#00ffcc'; // ACTIVE
        case 2: return '#00ff00'; // PASSED
        case 3: return '#ff0000'; // REJECTED
        case 4: return '#888'; // EXECUTED
        default: return '#666';
      }
    };

    const getStatusText = (status) => {
      switch(status) {
        case 0: return 'PENDING';
        case 1: return 'ACTIVE';
        case 2: return 'PASSED';
        case 3: return 'REJECTED';
        case 4: return 'EXECUTED';
        default: return 'UNKNOWN';
      }
    };

    const getProposalTypeText = (type) => {
      switch(type) {
        case 0: return 'Governance';
        case 1: return 'Discovery';
        case 2: return 'Weekly Topic';
        case 3: return 'Grant';
        case 4: return 'Knowledge Share';
        case 5: return 'Partnership';
        default: return 'General';
      }
    };

    // ✅ Check if voting is active
    const isVotingActive = proposal.status === 1 && 
                          proposal.endTime && 
                          new Date(proposal.endTime * 1000) > new Date();

    return (
      <div style={{
        background: 'rgba(0, 255, 204, 0.05)',
        border: '1px solid rgba(0, 255, 204, 0.3)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '16px'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <div style={{ 
                fontSize: '12px', 
                color: '#888', 
                marginBottom: '4px',
                textTransform: 'uppercase'
              }}>
                {getProposalTypeText(proposal.proposalType)}
              </div>
              <h3 style={{ color: '#00ffcc', margin: '0 0 8px 0' }}>{proposal.title}</h3>
            </div>
            <span style={{ 
              color: getStatusColor(proposal.status),
              fontSize: '12px',
              fontWeight: 'bold',
              padding: '4px 12px',
              background: `${getStatusColor(proposal.status)}20`,
              borderRadius: '4px'
            }}>
              {getStatusText(proposal.status)}
            </span>
          </div>
          
          <p style={{ color: '#ccc', fontSize: '14px', margin: '8px 0', lineHeight: '1.6' }}>
            {proposal.description}
          </p>
          
          <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
            Proposed by: {formatAddress(proposal.proposer)}
          </div>
        </div>

        {/* Vote Progress */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#00ff00', fontSize: '14px' }}>
              ✓ For: {proposal.votesFor || '0'} ({forPercentage}%)
            </span>
            <span style={{ color: '#ff0000', fontSize: '14px' }}>
              ✗ Against: {proposal.votesAgainst || '0'} ({(100 - forPercentage).toFixed(1)}%)
            </span>
          </div>
          
          <div style={{
            width: '100%',
            height: '8px',
            background: '#333',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${forPercentage}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #00ff00, #00ffcc)',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>

        {/* ✅ ALWAYS SHOW VOTE BUTTONS for active proposals */}
        {isVotingActive && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <button
              onClick={() => handleVote(proposal.id, true)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                background: loading ? '#666' : 'linear-gradient(135deg, #00ff00, #00cc00)',
                border: 'none',
                borderRadius: '8px',
                color: loading ? '#ccc' : '#000',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.transform = 'scale(1.02)')}
              onMouseLeave={(e) => !loading && (e.target.style.transform = 'scale(1)')}
            >
              {loading ? 'Voting...' : '✓ Vote FOR'}
            </button>
            <button
              onClick={() => handleVote(proposal.id, false)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                background: loading ? '#666' : 'linear-gradient(135deg, #ff0000, #cc0000)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.transform = 'scale(1.02)')}
              onMouseLeave={(e) => !loading && (e.target.style.transform = 'scale(1)')}
            >
              {loading ? 'Voting...' : '✗ Vote AGAINST'}
            </button>
          </div>
        )}

        {/* Voting ended message */}
        {proposal.status === 1 && !isVotingActive && (
          <div style={{
            padding: '12px',
            background: 'rgba(255, 165, 0, 0.1)',
            border: '1px solid rgba(255, 165, 0, 0.3)',
            borderRadius: '8px',
            color: '#ffa500',
            fontSize: '14px',
            textAlign: 'center',
            marginBottom: '12px'
          }}>
            Voting has ended
          </div>
        )}

        {/* Timestamp */}
        {proposal.endTime && (
          <div style={{ fontSize: '12px', color: '#888' }}>
            {isVotingActive ? (
              <>⏰ Voting ends: {new Date(proposal.endTime * 1000).toLocaleString()}</>
            ) : (
              <>🔒 Voting ended: {new Date(proposal.endTime * 1000).toLocaleString()}</>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 20px',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{
          fontSize: '48px',
          background: 'linear-gradient(135deg, #00ffcc, #00ff00)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px'
        }}>
          🌌 DeSci DAO Governance
        </h1>
        <p style={{ color: '#ccc', fontSize: '18px' }}>
          Community-driven scientific discovery and knowledge sharing
        </p>
      </div>

      {/* Wallet Connection */}
      {!isConnected ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'rgba(0, 255, 204, 0.05)',
          borderRadius: '16px',
          border: '2px dashed rgba(0, 255, 204, 0.3)'
        }}>
          <h2 style={{ color: '#00ffcc', marginBottom: '24px' }}>
            🔐 Connect Your Wallet
          </h2>
          <p style={{ color: '#ccc', marginBottom: '32px' }}>
            Connect your wallet to participate in DAO governance
          </p>
          <button
            onClick={connect}
            style={{
              padding: '16px 48px',
              background: 'linear-gradient(135deg, #00ffcc, #00ff00)',
              border: 'none',
              borderRadius: '12px',
              color: '#000',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          {/* User Info */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px',
            background: 'rgba(0, 255, 204, 0.1)',
            borderRadius: '12px',
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>
                Connected Wallet
              </div>
              <div style={{ fontSize: '18px', color: '#00ffcc', fontWeight: 'bold' }}>
                {formatAddress(account)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>
                Voting Power
              </div>
              <div style={{ fontSize: '18px', color: '#00ff00', fontWeight: 'bold' }}>
                {parseFloat(userBalance || 0).toFixed(2)} ASTRO
              </div>
            </div>
            <button
              onClick={disconnect}
              style={{
                padding: '12px 24px',
                background: 'rgba(255, 0, 0, 0.2)',
                border: '1px solid #ff0000',
                borderRadius: '8px',
                color: '#ff0000',
                cursor: 'pointer'
              }}
            >
              Disconnect
            </button>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '32px',
            borderBottom: '1px solid rgba(0, 255, 204, 0.2)',
            paddingBottom: '16px',
            flexWrap: 'wrap'
          }}>
            {[
              { id: 'all', label: '📋 All Proposals' },
              { id: 'weekly-topics', label: '📅 Weekly Topics' },
              { id: 'discoveries', label: '🔬 Discoveries' },
              { id: 'knowledge', label: '📚 Knowledge' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setRefreshTrigger(prev => prev + 1);
                }}
                style={{
                  padding: '12px 24px',
                  background: activeTab === tab.id ? 'rgba(0, 255, 204, 0.2)' : 'transparent',
                  border: activeTab === tab.id ? '1px solid #00ffcc' : '1px solid transparent',
                  borderRadius: '8px',
                  color: activeTab === tab.id ? '#00ffcc' : '#888',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Create Proposal Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              marginBottom: '32px',
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #00ffcc, #00ff00)',
              border: 'none',
              borderRadius: '12px',
              color: '#000',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ✨ Create New Proposal
          </button>

          {/* Proposals List */}
          <div>
            {loading && proposals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                Loading proposals...
              </div>
            ) : proposals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#888', fontSize: '18px' }}>
                  No proposals found. Create the first one!
                </p>
              </div>
            ) : (
              proposals.map(proposal => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))
            )}
          </div>
        </>
      )}

      {/* Create Proposal Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => setShowCreateModal(false)}
        >
          <div style={{
            background: '#1a1a1a',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            width: '100%',
            border: '1px solid rgba(0, 255, 204, 0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#00ffcc', marginBottom: '24px' }}>
              ✨ Create New Proposal
            </h2>
            
            <form onSubmit={handleCreateProposal}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>
                  Proposal Type
                </label>
                <select
                  value={proposalForm.type}
                  onChange={(e) => setProposalForm({ ...proposalForm, type: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#333',
                    border: '1px solid rgba(0, 255, 204, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <option value={0}>🏛️ Governance</option>
                  <option value={1}>🔬 Scientific Discovery</option>
                  <option value={2}>📅 Weekly Topic</option>
                  <option value={3}>💰 Research Grant</option>
                  <option value={4}>📚 Knowledge Sharing</option>
                  <option value={5}>🤝 Partnership</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={proposalForm.title}
                  onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                  required
                  placeholder="Enter proposal title..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#333',
                    border: '1px solid rgba(0, 255, 204, 0.3)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>
                  Description *
                </label>
                <textarea
                  value={proposalForm.description}
                  onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })}
                  required
                  rows={6}
                  placeholder="Describe your proposal in detail..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#333',
                    border: '1px solid rgba(0, 255, 204, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: loading ? '#666' : 'linear-gradient(135deg, #00ffcc, #00ff00)',
                    border: 'none',
                    borderRadius: '8px',
                    color: loading ? '#ccc' : '#000',
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px'
                  }}
                >
                  {loading ? '⏳ Creating...' : '✅ Create Proposal'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: 'transparent',
                    border: '1px solid #666',
                    borderRadius: '8px',
                    color: '#666',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DAODashboard;