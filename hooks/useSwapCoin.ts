import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { tradeCoin, TradeParameters } from '@zoralabs/coins-sdk';
import { parseEther, formatEther, Address } from 'viem';
import { toast } from 'react-hot-toast';
import { useSwapPath } from './useSwapPath';

interface SwapParams {
  tokenAddress: Address;
  amount: string;
  isBuy: boolean;
  slippage?: number; // Default 100 = 1%
  path?: Address[]; // Optional path for multi-hop trades
}

const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address;

export const useSwapCoin = () => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { getOptimalPath } = useSwapPath();
  const [isLoading, setIsLoading] = useState(false);

  const swap = useCallback(async ({ tokenAddress, amount, isBuy, slippage = 100, path }: SwapParams) => {
    if (!address || !walletClient || !publicClient) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setIsLoading(true);
      
      // Convert amount to Wei
      const amountInWei = parseEther(amount);

      // Get optimal swap path if not provided
      const swapPath = path || (await getOptimalPath({
        fromToken: isBuy ? ETH_ADDRESS : tokenAddress,
        toToken: isBuy ? tokenAddress : ETH_ADDRESS,
        amount,
        slippage,
      }))?.path;

      if (!swapPath) {
        throw new Error('Failed to find optimal swap path');
      }

      // Execute trades for each hop in the path
      let currentAmount = amountInWei;
      let txHash;

      for (let i = 0; i < swapPath.length - 1; i++) {
        const fromToken = swapPath[i];
        const toToken = swapPath[i + 1];

        // Prepare trade parameters for this hop
        const tradeParameters: TradeParameters = {
          sell: fromToken === ETH_ADDRESS 
            ? { type: 'eth' } 
            : { type: 'erc20', address: fromToken },
          buy: toToken === ETH_ADDRESS 
            ? { type: 'eth' }
            : { type: 'erc20', address: toToken },
          amountIn: currentAmount,
          sender: address,
          slippage,
        };

        // Execute trade for this hop
        txHash = await tradeCoin({
          tradeParameters,
          walletClient,
          account: walletClient.account!,
          publicClient,
        });

        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        // Update amount for next hop
        if (receipt.status !== 'success') {
          throw new Error(`Transaction failed at hop ${i + 1}`);
        }

        // Get output amount from event logs for next hop
        const outputAmount = BigInt(0); // TODO: Parse from event logs
        currentAmount = outputAmount;
      }

      // Final transaction hash will be from the last hop
      if (txHash) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        if (receipt.status === 'success') {
          toast.success(`Successfully ${isBuy ? 'bought' : 'sold'} tokens through ${swapPath.length - 1} hops`);
          return receipt;
        } else {
          throw new Error('Final transaction failed');
        }
      }
    } catch (error: any) {
      console.error('Swap error:', error);
      toast.error(error?.message || 'Failed to execute trade');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address, walletClient, publicClient, getOptimalPath]);

  return {
    swap,
    isLoading
  };
}; 