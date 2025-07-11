import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { createCoin, DeployCurrency, InitialPurchaseCurrency } from '@zoralabs/coins-sdk';
import { publicClient } from '@/providers/Web3Provider';
import { base } from 'viem/chains';
import { Address, parseEther } from 'viem';
import { useCreateMetadata } from './useCreateMetadata';

// Pool Configuration Types based on Zora CoinV4 documentation
interface PoolConfiguration {
  version: number;           // Configuration version (V4 = 4)
  numPositions: number;      // Number of liquidity positions
  fee: number;              // Fee tier for the pool (in basis points)
  tickSpacing: number;       // Tick spacing for the pool
  numDiscoveryPositions?: number[];  // Number of discovery positions
  tickLower?: number[];      // Lower tick bounds for positions
  tickUpper?: number[];      // Upper tick bounds for positions
  maxDiscoverySupplyShare?: number[]; // Maximum share for discovery supply
}

// Predefined pool configurations for different use cases
export const POOL_CONFIGS = {
  // Standard configuration for music/content coins
  STANDARD_MUSIC: {
    version: 4,
    numPositions: 2,
    fee: 500,        // 0.05% fee tier
    tickSpacing: 10, // Standard tick spacing for 0.05% pools
    numDiscoveryPositions: [1, 1],
    tickLower: [-276324, -138162],
    tickUpper: [138162, 276324],
    maxDiscoverySupplyShare: [5000, 3000] // 50% and 30% discovery supply
  } as PoolConfiguration,
  
  // High activity configuration for popular content
  HIGH_ACTIVITY: {
    version: 4,
    numPositions: 3,
    fee: 300,        // 0.03% fee tier for high volume
    tickSpacing: 6,  // Tighter tick spacing
    numDiscoveryPositions: [1, 1, 1],
    tickLower: [-414486, -207243, -103621],
    tickUpper: [103621, 207243, 414486],
    maxDiscoverySupplyShare: [4000, 3000, 2000] // 40%, 30%, 20% discovery supply
  } as PoolConfiguration,
  
  // Conservative configuration for stable content
  CONSERVATIVE: {
    version: 4,
    numPositions: 1,
    fee: 1000,       // 0.1% fee tier
    tickSpacing: 20, // Wider tick spacing
    numDiscoveryPositions: [1],
    tickLower: [-138162],
    tickUpper: [138162],
    maxDiscoverySupplyShare: [6000] // 60% discovery supply
  } as PoolConfiguration
};

interface CreateCoinParams {
  name: string;
  symbol: string;
  description: string;
  image: File;
  payoutRecipient: Address;
  platformReferrer?: Address;
  initialPurchaseAmount?: string; // in ETH
  poolConfig?: PoolConfiguration; // Custom pool configuration
  poolType?: keyof typeof POOL_CONFIGS; // Predefined pool type
  additionalOwners?: Address[]; // Additional owners beyond creator and payout recipient
}

export const useCreateCoin = () => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { createMetadata, isLoading: isMetadataLoading, error: metadataError } = useCreateMetadata();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = async (params: CreateCoinParams) => {
    if (!address || !walletClient) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create metadata first
      const metadataParams = await createMetadata({
        name: params.name,
        symbol: params.symbol,
        description: params.description,
        image: params.image,
        creatorAddress: address
      });

      // Determine pool configuration
      let poolConfig: PoolConfiguration;
      if (params.poolConfig) {
        poolConfig = params.poolConfig;
      } else if (params.poolType) {
        poolConfig = POOL_CONFIGS[params.poolType];
      } else {
        // Default to standard music configuration
        poolConfig = POOL_CONFIGS.STANDARD_MUSIC;
      }

      // Build owners array: always include creator and payout recipient
      const owners: Address[] = [address, params.payoutRecipient];
      
      // Add additional owners if provided, avoiding duplicates
      if (params.additionalOwners && params.additionalOwners.length > 0) {
        const additionalUniqueOwners = params.additionalOwners.filter(
          owner => !owners.includes(owner)
        );
        owners.push(...additionalUniqueOwners);
      }

      // Log multi-ownership setup
      console.log('Multi-ownership configuration:', {
        creator: address,
        payoutRecipient: params.payoutRecipient,
        additionalOwners: params.additionalOwners,
        finalOwners: owners,
        totalOwners: owners.length
      });

      // Prepare coin creation parameters with pool configuration
      const coinParams = {
        ...metadataParams,
        payoutRecipient: params.payoutRecipient,
        platformReferrer: params.platformReferrer,
        chainId: base.id,
        currency: DeployCurrency.ZORA,
        owners: owners, // Enhanced multi-owner support
        // Pool configuration for CoinV4
        poolConfig: {
          version: poolConfig.version,
          fee: poolConfig.fee,
          tickSpacing: poolConfig.tickSpacing,
          numPositions: poolConfig.numPositions,
          ...(poolConfig.numDiscoveryPositions && {
            numDiscoveryPositions: poolConfig.numDiscoveryPositions
          }),
          ...(poolConfig.tickLower && {
            tickLower: poolConfig.tickLower
          }),
          ...(poolConfig.tickUpper && {
            tickUpper: poolConfig.tickUpper
          }),
          ...(poolConfig.maxDiscoverySupplyShare && {
            maxDiscoverySupplyShare: poolConfig.maxDiscoverySupplyShare
          })
        },
        // Force V4 deployment for advanced pool features
        version: "v4" as const,
        ...(params.initialPurchaseAmount && {
          initialPurchase: {
            currency: InitialPurchaseCurrency.ETH,
            amount: parseEther(params.initialPurchaseAmount)
          }
        })
      };

      console.log('Creating coin with multi-owner configuration:', {
        poolConfig: coinParams.poolConfig,
        version: coinParams.version,
        owners: coinParams.owners
      });

      // Create the coin
      const result = await createCoin(coinParams, walletClient, publicClient);
      
      console.log('Coin created successfully with multi-ownership:', {
        address: result.address,
        version: result.deployment?.version,
        deployment: result.deployment,
        owners: owners
      });

      return result;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create coin');
      console.error('Coin creation error:', error);
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    create,
    isLoading: isLoading || isMetadataLoading,
    error: error || metadataError,
    POOL_CONFIGS // Export pool configs for UI selection
  };
}; 