// src/components/DAODashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useDAO } from '../hooks/useDao';

const DAODashboard = () => {
  const { account, connect, disconnect, isConnected, formatAddress, signer } = useWeb3();
  const { 
    userBalance, 
    createProposal, 
    vote, 
    getWeeklyTopics,
    getTopDiscoveries,
    hasUserVoted,
    loading 
  } = useDAO(signer, account);

  const [activeTab, setActiveTab] = useState('weekly-topics');
  const [weeklyTopics, setWeeklyTopics] = useState([]);
  const [discoveries, setDiscoveries] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notification, setNotification] = useState(null); // For success messages

  // Proposal form state
  const [proposalForm, setProposalForm] = useState({
    type: 0,
    title: '',
    description: '',
    ipfsHash: ''
  });

  // Load proposals - wrapped in useCallback to prevent infinite loops
  const loadProposals = useCallback(async () => {
    if (!isConnected) {
      console.log('Not connected, skipping proposal load');
      return;
    }
    
    console.log('Loading proposals for tab:', activeTab);
    
    try {
      if (activeTab === 'weekly-topics') {
        const topics = await getWeeklyTopics();
        console.log('Loaded weekly topics:', topics);
        setWeeklyTopics(topics || []);
      } else if (activeTab === 'discoveries') {
        const topDiscoveries = await getTopDiscoveries(20);
        console.log('Loaded discoveries:', topDiscoveries);
        setDiscoveries(topDiscoveries || []);
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
    }
  }, [activeTab, getWeeklyTopics, getTopDiscoveries, isConnected]);

  // Load proposals when dependencies change
  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const handleCreateProposal = async (e) => {
    e.preventDefault();
    
    console.log('Creating proposal:', proposalForm);
    
    try {
      const proposalId = await createProposal(
        proposalForm.type,
        proposalForm.title,
        proposalForm.description,
        proposalForm.ipfsHash
      );
      
      console.log('Proposal created with ID:', proposalId);
      
      // Show success notification
      setNotification({
        type: 'success',
        message: `🎉 Proposal #${proposalId} created successfully!`,
        details: `"${proposalForm.title}" - Your proposal is now live and ready for voting.`
      });
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
      
      setShowCreateModal(false);
      setProposalForm({ type: 0, title: '', description: '', ipfsHash: '' });
      
      // Immediately add optimistic update to UI
      const newProposal = {
        id: proposalId,
        proposer: account,
        proposalType: proposalForm.type,
        title: proposalForm.title,
        description: proposalForm.description,
        votesFor: 0,
        votesAgainst: 0,
        status: 1, // ACTIVE
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };
      
      // Add to appropriate list based on type
      if (proposalForm.type === 0) {
        setWeeklyTopics(prev => [newProposal, ...prev]);
      } else if (proposalForm.type === 1) {
        setDiscoveries(prev => [newProposal, ...prev]);
      }
      
      // Reload from blockchain after a delay to get accurate data
      setTimeout(() => {
        console.log('Reloading proposals from blockchain...');
        loadProposals();
      }, 2000);
      
    } catch (error) {
      console.error('Error creating proposal:', error);
      setNotification({
        type: 'error',
        message: '❌ Failed to create proposal',
        details: error.message
      });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleVote = async (proposalId, support) => {
    try {
      const hasVoted = await hasUserVoted(proposalId);
      if (hasVoted) {
        alert('You have already voted on this proposal');
        return;
      }

      await vote(proposalId, support);
      alert('Vote submitted successfully!');
      loadProposals();
    } catch (error) {
      alert('Failed to vote: ' + error.message);
    }
  };

  const ProposalCard = ({ proposal }) => {
    const totalVotes = parseFloat(proposal.votesFor || 0) + parseFloat(proposal.votesAgainst || 0);
    const forPercentage = totalVotes > 0 
      ? ((parseFloat(proposal.votesFor || 0) / totalVotes) * 100).toFixed(1)
      : 0;

    const getStatusColor = (status) => {
      switch(status) {
        case 1: return '#00ffcc'; // ACTIVE
        case 2: return '#00ff00'; // PASSED
        case 3: return '#ff0000'; // REJECTED
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

    // Check if proposal is active (allow voting if status is 1 or undefined for new proposals)
    const isActive = proposal.status === 1 || proposal.status === undefined;
    
    console.log('Proposal Card:', { 
      id: proposal.id, 
      status: proposal.status, 
      isActive,
      votesFor: proposal.votesFor,
      votesAgainst: proposal.votesAgainst 
    });

    // Check if current user created this proposal
    const isMyProposal = proposal.proposer?.toLowerCase() === account?.toLowerCase();

    return (
      <div style={{
        background: isMyProposal 
          ? 'rgba(0, 255, 204, 0.1)' 
          : 'rgba(0, 255, 204, 0.05)',
        border: isMyProposal 
          ? '2px solid rgba(0, 255, 204, 0.6)' 
          : '1px solid rgba(0, 255, 204, 0.3)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '16px',
        position: 'relative'
      }}>
        {/* "Your Proposal" Badge */}
        {isMyProposal && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'linear-gradient(135deg, #00ffcc, #00ff00)',
            color: '#000',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold'
          }}>
            YOUR PROPOSAL
          </div>
        )}
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ color: '#00ffcc', margin: '0', paddingRight: '120px' }}>
              {proposal.title}
            </h3>
            <span style={{ 
              color: getStatusColor(proposal.status),
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {getStatusText(proposal.status)}
            </span>
          </div>
          <p style={{ color: '#ccc', fontSize: '14px', margin: '8px 0' }}>
            {proposal.description}
          </p>
          <div style={{ 
            fontSize: '12px', 
            color: isMyProposal ? '#00ffcc' : '#888',
            fontWeight: isMyProposal ? 'bold' : 'normal'
          }}>
            {isMyProposal ? (
              <>🎯 You created this proposal</>
            ) : (
              <>Proposed by: {formatAddress(proposal.proposer)}</>
            )}
          </div>
        </div>

        {/* Vote Progress */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#00ff00', fontSize: '14px' }}>
              For: {proposal.votesFor} ({forPercentage}%)
            </span>
            <span style={{ color: '#ff0000', fontSize: '14px' }}>
              Against: {proposal.votesAgainst} ({(100 - forPercentage).toFixed(1)}%)
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

        {/* Vote Buttons - Show for active proposals */}
        {isActive && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => handleVote(proposal.id, true)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                background: 'linear-gradient(135deg, #00ff00, #00cc00)',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Voting...' : 'Vote FOR'}
            </button>
            <button
              onClick={() => handleVote(proposal.id, false)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                background: 'linear-gradient(135deg, #ff0000, #cc0000)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Voting...' : 'Vote AGAINST'}
            </button>
          </div>
        )}

        {proposal.endTime && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#888' }}>
            Voting ends: {proposal.endTime.toLocaleString()}
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
      {/* Success/Error Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          maxWidth: '400px',
          background: notification.type === 'success' 
            ? 'linear-gradient(135deg, rgba(0, 255, 0, 0.2), rgba(0, 255, 204, 0.2))'
            : 'linear-gradient(135deg, rgba(255, 0, 0, 0.2), rgba(255, 100, 0, 0.2))',
          border: notification.type === 'success'
            ? '2px solid #00ff00'
            : '2px solid #ff0000',
          borderRadius: '12px',
          padding: '20px',
          zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: notification.type === 'success' ? '#00ff00' : '#ff0000',
            marginBottom: '8px'
          }}>
            {notification.message}
          </div>
          <div style={{ fontSize: '14px', color: '#ccc' }}>
            {notification.details}
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h1 style={{
          fontSize: '48px',
          background: 'linear-gradient(135deg, #00ffcc, #00ff00)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px'
        }}>
          Astro DAO Governance
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
            Connect Your Wallet
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
                {parseFloat(userBalance).toFixed(2)} ASTRO
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
              { id: 'weekly-topics', label: 'Weekly Topics' },
              { id: 'discoveries', label: 'Scientific Discoveries' },
              { id: 'knowledge', label: 'Knowledge Sharing' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 24px',
                  background: activeTab === tab.id ? 'rgba(0, 255, 204, 0.2)' : 'transparent',
                  border: activeTab === tab.id ? '1px solid #00ffcc' : '1px solid transparent',
                  borderRadius: '8px',
                  color: activeTab === tab.id ? '#00ffcc' : '#888',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.id ? 'bold' : 'normal'
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
            + Create New Proposal
          </button>

          {/* Proposals List */}
          <div>
            {activeTab === 'weekly-topics' && weeklyTopics.length > 0 && 
              weeklyTopics.map(proposal => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))
            }
            {activeTab === 'discoveries' && discoveries.length > 0 && 
              discoveries.map(proposal => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))
            }
            {((activeTab === 'weekly-topics' && weeklyTopics.length === 0) ||
              (activeTab === 'discoveries' && discoveries.length === 0)) && (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                background: 'rgba(0, 255, 204, 0.05)',
                border: '1px dashed rgba(0, 255, 204, 0.3)',
                borderRadius: '12px',
                color: '#888'
              }}>
                No proposals yet. Be the first to create one!
              </div>
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
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => setShowCreateModal(false)}
        >
          <div style={{
            background: '#1a1a1a',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            width: '90%',
            border: '1px solid rgba(0, 255, 204, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#00ffcc', marginBottom: '24px' }}>
              Create New Proposal
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
                    color: '#fff'
                  }}
                >
                  <option value={0}>Weekly Topic</option>
                  <option value={1}>Scientific Discovery</option>
                  <option value={2}>Knowledge Sharing</option>
                  <option value={3}>Funding</option>
                  <option value={4}>General</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>
                  Title
                </label>
                <input
                  type="text"
                  value={proposalForm.title}
                  onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                  required
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
                  Description
                </label>
                <textarea
                  value={proposalForm.description}
                  onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })}
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#333',
                    border: '1px solid rgba(0, 255, 204, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: loading 
                      ? 'rgba(0, 255, 204, 0.3)' 
                      : 'linear-gradient(135deg, #00ffcc, #00ff00)',
                    border: 'none',
                    borderRadius: '8px',
                    color: loading ? '#666' : '#000',
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Creating...' : 'Create Proposal'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'transparent',
                    border: '1px solid #666',
                    borderRadius: '8px',
                    color: '#666',
                    cursor: 'pointer'
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