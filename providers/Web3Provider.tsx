"use client";

import { createConfig, WagmiProvider, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setApiKey } from '@zoralabs/coins-sdk';
import { createPublicClient } from 'viem';

// Configure chains for the app
const config = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL),
  },
});

// Create a client for React Query
const queryClient = new QueryClient();

// Create public client for Zora interactions
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL),
});

// Initialize Zora Coins SDK with API key
const ZORA_API_KEY = process.env.NEXT_PUBLIC_ZORA_API_KEY;
if (ZORA_API_KEY) {
  setApiKey(ZORA_API_KEY);
} else {
  console.warn('NEXT_PUBLIC_ZORA_API_KEY not found in environment variables');
}

interface Web3ProviderProps {
  children: React.ReactNode;
}

const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Web3Provider; 