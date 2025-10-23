import { useState, useEffect } from 'react';

export function useMetaMask() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if MetaMask is installed
    setIsInstalled(!!window.ethereum);

    // Check if already connected
    if (window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0]);
          }
        })
        .catch(console.error);
    }
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed');
      return null;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        setError('No accounts found');
        return null;
      }

      setAddress(accounts[0]);
      return accounts[0];
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Connection rejected by user');
      } else {
        setError(err.message || 'Failed to connect');
      }
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const signMessage = async (message: string) => {
    if (!window.ethereum || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });
      return signature;
    } catch (err: any) {
      if (err.code === 4001) {
        throw new Error('Signature rejected by user');
      }
      throw err;
    }
  };

  return {
    isInstalled,
    address,
    isConnecting,
    error,
    connect,
    signMessage
  };
}
