// src/hooks/useWeb3.js
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const BNB_TESTNET_CHAIN_ID = '0x61'; // 97 in hex
const BNB_MAINNET_CHAIN_ID = '0x38'; // 56 in hex

const BNB_TESTNET_PARAMS = {
  chainId: BNB_TESTNET_CHAIN_ID,
  chainName: 'BNB Smart Chain Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'tBNB',
    decimals: 18
  },
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
  blockExplorerUrls: ['https://testnet.bscscan.com']
};

const BNB_MAINNET_PARAMS = {
  chainId: BNB_MAINNET_CHAIN_ID,
  chainName: 'BNB Smart Chain Mainnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrls: ['https://bsc-dataseed1.binance.org'],
  blockExplorerUrls: ['https://bscscan.com']
};

export const useWeb3 = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = useCallback(() => {
    return typeof window.ethereum !== 'undefined';
  }, []);

  // Connect wallet
  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      setError('Please install MetaMask to use this feature');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      // Create provider with static network to avoid ENS lookups
      const network = ethers.Network.from(97); // BSC Testnet
      const browserProvider = new ethers.BrowserProvider(window.ethereum, network);
      
      const signer = await browserProvider.getSigner();
      const connectedNetwork = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(signer);
      setAccount(accounts[0]);
      setChainId(connectedNetwork.chainId.toString());

      // Store connection state
      localStorage.setItem('walletConnected', 'true');
      
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  }, [isMetaMaskInstalled]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    localStorage.removeItem('walletConnected');
  }, []);

  // Switch to BNB Chain
  const switchToBNB = useCallback(async (useTestnet = true) => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask not installed');
      return;
    }

    const targetChainId = useTestnet ? BNB_TESTNET_CHAIN_ID : BNB_MAINNET_CHAIN_ID;
    const networkParams = useTestnet ? BNB_TESTNET_PARAMS : BNB_MAINNET_PARAMS;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }],
      });
    } catch (switchError) {
      // Chain hasn't been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkParams],
          });
        } catch (addError) {
          console.error('Failed to add BNB chain:', addError);
          setError('Failed to add BNB chain to MetaMask');
        }
      } else {
        console.error('Failed to switch to BNB chain:', switchError);
        setError('Failed to switch to BNB chain');
      }
    }
  }, [isMetaMaskInstalled]);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = (chainId) => {
      setChainId(parseInt(chainId, 16).toString());
      window.location.reload(); // Recommended by MetaMask
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect]);

  // Auto-connect if previously connected
  useEffect(() => {
    const wasConnected = localStorage.getItem('walletConnected');
    if (wasConnected === 'true' && isMetaMaskInstalled()) {
      connect();
    }
  }, [connect, isMetaMaskInstalled]);

  // Format address for display
  const formatAddress = useCallback((address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  return {
    account,
    provider,
    signer,
    chainId,
    isConnecting,
    error,
    connect,
    disconnect,
    switchToBNB,
    isMetaMaskInstalled,
    formatAddress,
    isConnected: !!account
  };
};