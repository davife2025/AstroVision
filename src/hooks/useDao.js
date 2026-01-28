// src/hooks/useDAO.js - FIXED VERSION
import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from './useWeb3';
import AstroDAOABI from '../AstroDAO.json';
import AstroTokenABI from '../AstroToken.json';

// Your deployed contract addresses
const DAO_CONTRACT_ADDRESS = process.env.REACT_APP_DAO_CONTRACT_ADDRESS || '0x1E58bC5bc393a04E3391fd43Fd82E976e56A2464';
const TOKEN_CONTRACT_ADDRESS = process.env.REACT_APP_TOKEN_CONTRACT_ADDRESS || '0xbB652882B65bEAe5093B64186A21211a8439D579';

export const useDAO = () => {
  const { signer, account, isConnected } = useWeb3();
  
  const [daoContract, setDaoContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [userBalance, setUserBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0); // ✅ Track last update

  // Initialize contracts when signer is available
  useEffect(() => {
    if (signer && isConnected) {
      try {
        const dao = new ethers.Contract(
          ethers.getAddress(DAO_CONTRACT_ADDRESS), 
          AstroDAOABI.abi, 
          signer
        );
        const token = new ethers.Contract(
          ethers.getAddress(TOKEN_CONTRACT_ADDRESS), 
          AstroTokenABI.abi, 
          signer
        );
        
        setDaoContract(dao);
        setTokenContract(token);
      } catch (error) {
        console.error('Error initializing contracts:', error);
      }
    } else {
      setDaoContract(null);
      setTokenContract(null);
    }
  }, [signer, isConnected]);

  // Get user token balance
  const getUserBalance = useCallback(async () => {
    if (!tokenContract || !account) {
      setUserBalance('0');
      return;
    }
    
    try {
      console.log('💰 Fetching user balance...');
      const checksumAddress = ethers.getAddress(account);
      const balance = await tokenContract.balanceOf(checksumAddress);
      const formattedBalance = ethers.formatEther(balance);
      setUserBalance(formattedBalance);
      console.log('✅ Balance updated:', formattedBalance);
      setLastUpdate(Date.now()); // ✅ Track update time
    } catch (error) {
      console.error('❌ Error fetching balance:', error);
      setUserBalance('0');
    }
  }, [tokenContract, account]);

  // ✅ New: Force refresh function
  const refreshData = useCallback(async () => {
    console.log('🔄 Refreshing user data...');
    await getUserBalance();
  }, [getUserBalance]);

  // Create a new proposal
  const createProposal = useCallback(async (proposalType, title, description, ipfsHash = '') => {
    if (!daoContract) throw new Error('DAO contract not initialized');
    
    setLoading(true);
    try {
      console.log('📝 Creating proposal...');
      
      const tx = await daoContract.createProposal.populateTransaction(
        proposalType, 
        title, 
        description, 
        ipfsHash
      );
      
      const response = await signer.sendTransaction(tx);
      console.log('⏳ Waiting for confirmation...');
      const receipt = await response.wait();
      console.log('✅ Proposal created!');
      
      // ✅ Refresh balance after action
      setTimeout(() => refreshData(), 2000);
      
      // Extract proposal ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = daoContract.interface.parseLog(log);
          return parsed && parsed.name === 'ProposalCreated';
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = daoContract.interface.parseLog(event);
        return parsed.args.proposalId.toString();
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error creating proposal:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [daoContract, signer, refreshData]);

  // Submit a scientific discovery
  const submitDiscovery = useCallback(async (title, description, researcherName, paperIPFS) => {
    if (!daoContract) throw new Error('DAO contract not initialized');
    
    setLoading(true);
    try {
      console.log('🔬 Submitting discovery...');
      
      const tx = await daoContract.submitDiscovery.populateTransaction(
        title, 
        description, 
        researcherName, 
        paperIPFS
      );
      const response = await signer.sendTransaction(tx);
      const receipt = await response.wait();
      
      console.log('✅ Discovery submitted!');
      
      // ✅ Refresh balance after action
      setTimeout(() => refreshData(), 2000);
      
      return receipt;
    } catch (error) {
      console.error('❌ Error submitting discovery:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [daoContract, signer, refreshData]);

  // Vote on a proposal
  const vote = useCallback(async (proposalId, support) => {
    if (!daoContract) throw new Error('DAO contract not initialized');
    
    setLoading(true);
    try {
      console.log('🗳️ Casting vote...', { proposalId, support });
      
      const tx = await daoContract.vote.populateTransaction(proposalId, support);
      const response = await signer.sendTransaction(tx);
      
      console.log('⏳ Waiting for vote confirmation...');
      await response.wait();
      
      console.log('✅ Vote cast successfully!');
      
      // ✅ Refresh balance immediately after voting
      setTimeout(() => {
        console.log('🔄 Refreshing balance after vote...');
        refreshData();
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('❌ Error voting:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [daoContract, signer, refreshData]);

  // Get proposal details
  const getProposal = useCallback(async (proposalId) => {
    if (!daoContract) return null;
    
    try {
      const proposal = await daoContract.getProposal(proposalId);
      
      const id = proposal.id ? proposal.id.toString() : proposalId.toString();
      const votesFor = proposal.votesFor ? ethers.formatEther(proposal.votesFor) : '0';
      const votesAgainst = proposal.votesAgainst ? ethers.formatEther(proposal.votesAgainst) : '0';
      const endTime = proposal.endTime ? new Date(Number(proposal.endTime) * 1000) : new Date();
      
      return {
        id,
        proposer: proposal.proposer || '',
        proposalType: proposal.proposalType || 0,
        title: proposal.title || '',
        description: proposal.description || '',
        votesFor,
        votesAgainst,
        endTime,
        status: proposal.status || 0
      };
    } catch (error) {
      console.error('❌ Error fetching proposal:', error);
      return null;
    }
  }, [daoContract]);

  // ✅ NEW: Get active proposals (all proposals)
  const getActiveProposals = useCallback(async () => {
    if (!daoContract) return [];
    
    try {
      console.log('📊 Fetching active proposals...');
      
      // Try to get proposal count
      let proposalCount = 0;
      try {
        proposalCount = await daoContract.proposalCount();
        proposalCount = Number(proposalCount);
      } catch (error) {
        console.log('Using alternative method to get proposals');
        // If proposalCount doesn't exist, try getting proposals directly
      }
      
      const proposals = [];
      
      // Get proposals from 1 to proposalCount
      for (let i = 1; i <= proposalCount; i++) {
        try {
          const proposal = await getProposal(i);
          if (proposal && proposal.id !== '0') {
            proposals.push(proposal);
          }
        } catch (err) {
          console.log(`Proposal ${i} not found, stopping`);
          break;
        }
      }
      
      console.log('✅ Loaded proposals:', proposals.length);
      return proposals;
    } catch (error) {
      console.error('❌ Error fetching active proposals:', error);
      return [];
    }
  }, [daoContract, getProposal]);

  // Get all weekly topic proposals
  const getWeeklyTopics = useCallback(async () => {
    if (!daoContract) return [];
    
    try {
      const proposalIds = await daoContract.getWeeklyTopics();
      
      if (!proposalIds || proposalIds.length === 0) {
        return [];
      }
      
      const proposals = await Promise.all(
        proposalIds.map(id => getProposal(id.toString()))
      );
      
      return proposals.filter(p => p !== null);
    } catch (error) {
      console.error('❌ Error fetching weekly topics:', error);
      return [];
    }
  }, [daoContract, getProposal]);

  // Get top scientific discoveries
  const getTopDiscoveries = useCallback(async (count = 10) => {
    if (!daoContract) return [];
    
    try {
      const proposalIds = await daoContract.getTopDiscoveries(count);
      
      if (!proposalIds || proposalIds.length === 0) {
        return [];
      }
      
      const discoveries = await Promise.all(
        proposalIds.map(id => getProposal(id.toString()))
      );
      
      return discoveries.filter(d => d !== null && d.id !== '0');
    } catch (error) {
      console.error('❌ Error fetching top discoveries:', error);
      return [];
    }
  }, [daoContract, getProposal]);

  // Check if user has voted
  const hasUserVoted = useCallback(async (proposalId) => {
    if (!daoContract || !account) return false;
    
    try {
      const checksumAddress = ethers.getAddress(account);
      return await daoContract.hasVoted(proposalId, checksumAddress);
    } catch (error) {
      console.error('❌ Error checking vote status:', error);
      return false;
    }
  }, [daoContract, account]);

  // Finalize proposal
  const finalizeProposal = useCallback(async (proposalId) => {
    if (!daoContract) throw new Error('DAO contract not initialized');
    
    setLoading(true);
    try {
      const tx = await daoContract.finalizeProposal.populateTransaction(proposalId);
      const response = await signer.sendTransaction(tx);
      await response.wait();
      
      // ✅ Refresh balance after action
      setTimeout(() => refreshData(), 2000);
      
      return true;
    } catch (error) {
      console.error('❌ Error finalizing proposal:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [daoContract, signer, refreshData]);

  // Fetch user balance when contracts are ready
  useEffect(() => {
    if (tokenContract && account) {
      getUserBalance();
    }
  }, [tokenContract, account, getUserBalance]);

  // ✅ Auto-refresh balance every 15 seconds
  useEffect(() => {
    if (!tokenContract || !account) return;
    
    const interval = setInterval(() => {
      console.log('⏰ Auto-refreshing balance...');
      getUserBalance();
    }, 15000); // Every 15 seconds
    
    return () => clearInterval(interval);
  }, [tokenContract, account, getUserBalance]);

  return {
    daoContract,
    tokenContract,
    userBalance,
    loading,
    lastUpdate, // ✅ Export last update timestamp
    createProposal,
    submitDiscovery,
    vote,
    getProposal,
    getActiveProposals, // ✅ Export new function
    getWeeklyTopics,
    getTopDiscoveries,
    hasUserVoted,
    finalizeProposal,
    getUserBalance,
    refreshData // ✅ Export refresh function
  };
};