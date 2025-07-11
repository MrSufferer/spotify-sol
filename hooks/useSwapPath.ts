import { useCallback, useState } from 'react';
import { Address, parseEther, formatEther } from 'viem';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { tradeCoin, TradeParameters } from '@zoralabs/coins-sdk';
import { toast } from 'react-hot-toast';

// Common token addresses for routing
const COMMON_INTERMEDIARIES = {
  USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Address,
  WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619' as Address,
  WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' as Address
} as const;

export interface SwapPathParams {
  fromToken: Address;
  toToken: Address;
  amount: string;
  slippage?: number; // Default 100 = 1%
  maxHops?: number; // Maximum number of intermediate hops
}

export interface SwapPathResult {
  path: Address[];
  expectedOutput: bigint;
  minOutput: bigint;
  fee: bigint;
  estimatedGas: bigint;
  intermediaryOutputs: bigint[]; // Expected outputs at each hop
}

interface PoolInfo {
  fee: number;
  liquidity: bigint;
  sqrtPriceX96: bigint;
}

export const useSwapPath = () => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get pool information for a token pair
  const getPoolInfo = useCallback(async (tokenA: Address, tokenB: Address): Promise<PoolInfo | null> => {
    if (!publicClient) return null;
    
    try {
      // For now, we'll use a simplified pool key generation
      // In production, you should use the proper Zora pool key function
      const poolAddress = `0x${tokenA.slice(2, 22)}${tokenB.slice(2, 22)}` as Address;

      // Get pool data from contract
      const poolData = await publicClient.readContract({
        address: poolAddress,
        abi: [
          {
            name: 'slot0',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [
              { name: 'sqrtPriceX96', type: 'uint160' },
              { name: 'tick', type: 'int24' },
              { name: 'observationIndex', type: 'uint16' },
              { name: 'observationCardinality', type: 'uint16' },
              { name: 'observationCardinalityNext', type: 'uint16' },
              { name: 'feeProtocol', type: 'uint8' },
              { name: 'unlocked', type: 'bool' }
            ]
          }
        ],
        functionName: 'slot0'
      });

      const liquidity = await publicClient.readContract({
        address: poolAddress,
        abi: [
          {
            name: 'liquidity',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: '', type: 'uint128' }]
          }
        ],
        functionName: 'liquidity'
      });

      return {
        fee: 500, // Default to 0.05% fee
        liquidity: BigInt(liquidity as any),
        sqrtPriceX96: BigInt((poolData as any)[0])
      };
    } catch (error) {
      console.error('Error getting pool info:', error);
      return null;
    }
  }, [publicClient]);

  // Find all possible paths between two tokens
  const findPaths = useCallback(async (
    fromToken: Address,
    toToken: Address,
    maxHops: number = 2
  ): Promise<Address[][]> => {
    const paths: Address[][] = [];
    const intermediaries = Object.values(COMMON_INTERMEDIARIES);

    // Direct path
    const directPool = await getPoolInfo(fromToken, toToken);
    if (directPool) {
      paths.push([fromToken, toToken]);
    }

    // Single hop paths through common intermediaries
    for (const inter of intermediaries) {
      if (inter !== fromToken && inter !== toToken) {
        const pool1 = await getPoolInfo(fromToken, inter);
        const pool2 = await getPoolInfo(inter, toToken);
        
        if (pool1 && pool2) {
          paths.push([fromToken, inter, toToken]);
        }
      }
    }

    // Double hop paths if maxHops > 1
    if (maxHops > 1) {
      for (let i = 0; i < intermediaries.length; i++) {
        for (let j = i + 1; j < intermediaries.length; j++) {
          const inter1 = intermediaries[i];
          const inter2 = intermediaries[j];
          
          if (inter1 !== fromToken && inter1 !== toToken && 
              inter2 !== fromToken && inter2 !== toToken) {
            const pool1 = await getPoolInfo(fromToken, inter1);
            const pool2 = await getPoolInfo(inter1, inter2);
            const pool3 = await getPoolInfo(inter2, toToken);
            
            if (pool1 && pool2 && pool3) {
              paths.push([fromToken, inter1, inter2, toToken]);
            }
          }
        }
      }
    }

    return paths;
  }, [getPoolInfo]);

  // Simulate a trade to get expected output
  const simulateTrade = useCallback(async (
    path: Address[],
    amountIn: bigint
  ): Promise<SwapPathResult | null> => {
    if (!address || !walletClient || !publicClient) return null;

    try {
      let currentAmount = amountIn;
      const intermediaryOutputs: bigint[] = [];
      let totalFee = BigInt(0);
      let totalGas = BigInt(0);

      // Simulate each hop in the path
      for (let i = 0; i < path.length - 1; i++) {
        const fromToken = path[i];
        const toToken = path[i + 1];

        const tradeParameters: TradeParameters = {
          sell: { type: 'erc20', address: fromToken },
          buy: { type: 'erc20', address: toToken },
          amountIn: currentAmount,
          sender: address,
          slippage: 100,
        };

        const tradePath = await tradeCoin({
          tradeParameters,
          walletClient,
          account: walletClient.account!,
          publicClient,
        });

        if (!tradePath) {
          return null;
        }

        currentAmount = tradePath.expectedOutput;
        intermediaryOutputs.push(currentAmount);
        totalFee += tradePath.fee || BigInt(0);
        totalGas += BigInt(21000); // Base gas cost per hop
      }

      return {
        path,
        expectedOutput: currentAmount,
        minOutput: currentAmount * BigInt(99) / BigInt(100), // 1% slippage
        fee: totalFee,
        estimatedGas: totalGas,
        intermediaryOutputs,
      };
    } catch (error) {
      console.error('Error simulating trade:', error);
      return null;
    }
  }, [address, walletClient, publicClient]);

  // Get optimal trade path
  const getOptimalPath = useCallback(async (
    { fromToken, toToken, amount, slippage = 100, maxHops = 2 }: SwapPathParams
  ): Promise<SwapPathResult | null> => {
    if (!address || !walletClient || !publicClient) {
      toast.error('Please connect your wallet');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Convert amount to Wei
      const amountInWei = parseEther(amount);

      // Find all possible paths
      const paths = await findPaths(fromToken, toToken, maxHops);
      if (paths.length === 0) {
        throw new Error('No valid trade paths found');
      }

      // Simulate trades for each path
      const results = await Promise.all(
        paths.map(path => simulateTrade(path, amountInWei))
      );

      // Filter out failed simulations and find best path
      const validResults = results.filter((result): result is SwapPathResult => result !== null);
      if (validResults.length === 0) {
        throw new Error('No valid trades found');
      }

      // Find path with best output (accounting for gas costs)
      const bestPath = validResults.reduce((best, current) => {
        const bestOutput = best.expectedOutput - (best.estimatedGas * BigInt(1e9)); // Subtract gas cost
        const currentOutput = current.expectedOutput - (current.estimatedGas * BigInt(1e9));
        return currentOutput > bestOutput ? current : best;
      });

      // Apply slippage to best path
      const slippageFactor = BigInt(10000 - slippage) / BigInt(10000);
      bestPath.minOutput = bestPath.expectedOutput * slippageFactor;

      return bestPath;
    } catch (error: any) {
      console.error('Trade path error:', error);
      const err = error instanceof Error ? error : new Error('Failed to find trade path');
      setError(err);
      toast.error(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address, walletClient, publicClient, findPaths, simulateTrade]);

  // Format path for display
  const formatPathForDisplay = useCallback((
    path: Address[],
    intermediaryOutputs: bigint[]
  ): string => {
    return path.map((address, i) => {
      const isIntermediary = i > 0 && i < path.length - 1;
      const symbol = Object.entries(COMMON_INTERMEDIARIES)
        .find(([, addr]) => addr === address)?.[0] || 'Unknown';
      
      if (i === path.length - 1) {
        return symbol;
      }
      
      const arrow = isIntermediary ? 
        ` (${formatEther(intermediaryOutputs[i-1])} ${symbol}) → ` : 
        ' → ';
      
      return symbol + arrow;
    }).join('');
  }, []);

  return {
    getOptimalPath,
    formatPathForDisplay,
    isLoading,
    error,
  };
}; 