// src/hooks/useUnibase.js - FIXED VERSION
import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const UNIBASE_API_URL = process.env.REACT_APP_UNIBASE_API_URL || 'http://localhost:5000/api';

export const useUnibase = (userAddress) => {
  const [profile, setProfile] = useState(null);
  const [discoveries, setDiscoveries] = useState([]);
  const [votes, setVotes] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if backend is running
  const checkHealth = useCallback(async () => {
    try {
      const response = await axios.get(`${UNIBASE_API_URL}/health`);
      console.log('✅ Unibase backend connected:', response.data);
      return true;
    } catch (err) {
      console.error('❌ Unibase backend not available:', err.message);
      setError('Unibase backend not available. Make sure Python server is running on port 5000');
      return false;
    }
  }, []); // No dependencies needed

  // Load user profile
  const loadProfile = useCallback(async () => {
    if (!userAddress) return null;
    
    try {
      const response = await axios.get(`${UNIBASE_API_URL}/profile/${userAddress}`);
      setProfile(response.data);
      return response.data;
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err.message);
      return null;
    }
  }, [userAddress]);

  // Load discoveries
  const loadDiscoveries = useCallback(async (limit = 20) => {
    if (!userAddress) return [];
    
    try {
      const response = await axios.get(
        `${UNIBASE_API_URL}/discoveries/${userAddress}?limit=${limit}`
      );
      setDiscoveries(response.data);
      return response.data;
    } catch (err) {
      console.error('Error loading discoveries:', err);
      setError(err.message);
      return [];
    }
  }, [userAddress]);

  // Load voting history
  const loadVotes = useCallback(async (limit = 20) => {
    if (!userAddress) return [];
    
    try {
      const response = await axios.get(
        `${UNIBASE_API_URL}/votes/${userAddress}?limit=${limit}`
      );
      setVotes(response.data);
      return response.data;
    } catch (err) {
      console.error('Error loading votes:', err);
      setError(err.message);
      return [];
    }
  }, [userAddress]);

  // Load proposals
  const loadProposals = useCallback(async (limit = 20) => {
    if (!userAddress) return [];
    
    try {
      const response = await axios.get(
        `${UNIBASE_API_URL}/proposals/${userAddress}?limit=${limit}`
      );
      setProposals(response.data);
      return response.data;
    } catch (err) {
      console.error('Error loading proposals:', err);
      setError(err.message);
      return [];
    }
  }, [userAddress]);

  // ✅ FIX: Initialize Unibase for user (with all dependencies)
  const initialize = useCallback(async () => {
    if (!userAddress) return;
    
    setLoading(true);
    try {
      const healthy = await checkHealth();
      if (!healthy) {
        setIsInitialized(false);
        return;
      }

      // Load all user data
      await Promise.all([
        loadProfile(),
        loadDiscoveries(),
        loadVotes(),
        loadProposals()
      ]);

      setIsInitialized(true);
      console.log('✅ Unibase initialized for:', userAddress);
    } catch (err) {
      console.error('❌ Unibase initialization error:', err);
      setError(err.message);
      setIsInitialized(false);
    } finally {
      setLoading(false);
    }
  }, [userAddress, checkHealth, loadProfile, loadDiscoveries, loadVotes, loadProposals]); // ✅ All dependencies

  // Update user profile
  const updateProfile = useCallback(async (updates) => {
    if (!userAddress) return null;
    
    setLoading(true);
    try {
      const response = await axios.post(`${UNIBASE_API_URL}/profile/${userAddress}`, updates);
      setProfile(response.data);
      console.log('✅ Profile updated');
      return response.data;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  // Save discovery
  const saveDiscovery = useCallback(async (discoveryData) => {
    if (!userAddress) return null;
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${UNIBASE_API_URL}/discoveries/${userAddress}`,
        discoveryData
      );
      
      // Reload discoveries and profile
      await Promise.all([
        loadDiscoveries(),
        loadProfile()
      ]);
      
      console.log('✅ Discovery saved to Unibase:', response.data.id);
      return response.data;
    } catch (err) {
      console.error('Error saving discovery:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userAddress, loadDiscoveries, loadProfile]);

  // Save vote
  const saveVote = useCallback(async (voteData) => {
    if (!userAddress) return null;
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${UNIBASE_API_URL}/votes/${userAddress}`,
        voteData
      );
      
      // Reload votes and profile
      await Promise.all([
        loadVotes(),
        loadProfile()
      ]);
      
      console.log('✅ Vote saved to Unibase:', response.data.id);
      return response.data;
    } catch (err) {
      console.error('Error saving vote:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userAddress, loadVotes, loadProfile]);

  // Save proposal
  const saveProposal = useCallback(async (proposalData) => {
    if (!userAddress) return null;
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${UNIBASE_API_URL}/proposals/${userAddress}`,
        proposalData
      );
      
      // Reload proposals and profile
      await Promise.all([
        loadProposals(),
        loadProfile()
      ]);
      
      console.log('✅ Proposal saved to Unibase:', response.data.id);
      return response.data;
    } catch (err) {
      console.error('Error saving proposal:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userAddress, loadProposals, loadProfile]);

  // Load complete user journey
  const loadJourney = useCallback(async () => {
    if (!userAddress) return null;
    
    setLoading(true);
    try {
      const response = await axios.get(`${UNIBASE_API_URL}/journey/${userAddress}`);
      setJourney(response.data);
      return response.data;
    } catch (err) {
      console.error('Error loading journey:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await initialize();
  }, [initialize]);

  // Auto-initialize when user address changes
  useEffect(() => {
    if (userAddress) {
      initialize();
    } else {
      setIsInitialized(false);
      setProfile(null);
      setDiscoveries([]);
      setVotes([]);
      setProposals([]);
      setJourney(null);
    }
  }, [userAddress, initialize]);

  return {
    // State
    isInitialized,
    profile,
    discoveries,
    votes,
    proposals,
    journey,
    loading,
    error,

    // Actions
    updateProfile,
    saveDiscovery,
    saveVote,
    saveProposal,
    loadProfile,
    loadDiscoveries,
    loadVotes,
    loadProposals,
    loadJourney,
    refresh,
    checkHealth
  };
};