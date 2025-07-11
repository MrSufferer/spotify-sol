import { useState, useEffect, useCallback } from 'react';
import { Address, parseAbiItem, formatEther, Log } from 'viem';
import { usePublicClient, useWatchContractEvent } from 'wagmi';
import { CoinRewardData, RewardEvent, SwapEvent } from '@/types';

// CoinV4 reward distribution event ABIs
const COIN_MARKET_REWARDS_V4_ABI = parseAbiItem(
  'event CoinMarketRewardsV4(address indexed coin, address indexed creator, uint256 creatorReward, address indexed createReferral, uint256 createReferralReward, address tradeReferral, uint256 tradeReferralReward, uint256 protocolReward)'
);

const COIN_TRADE_REWARDS_ABI = parseAbiItem(
  'event CoinTradeRewards(address indexed coin, address indexed trader, uint256 tradeReferralReward, address indexed tradeReferral)'
);

const COIN_TRANSFER_ABI = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);

const SWAP_ABI = parseAbiItem(
  'event Swap(address indexed sender, address indexed to, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)'
);

interface UseRewardDistributionParams {
  coinAddress?: Address;
  poolAddress?: Address;
  enabled?: boolean;
}

export const useRewardDistribution = ({ 
  coinAddress, 
  poolAddress, 
  enabled = true 
}: UseRewardDistributionParams) => {
  const publicClient = usePublicClient();
  const [rewardData, setRewardData] = useState<CoinRewardData>({
    creatorRewards: '0',
    createReferralRewards: '0',
    tradeReferralRewards: '0',
    protocolRewards: '0',
    totalVolume: '0',
    lastUpdated: 0
  });
  const [rewardEvents, setRewardEvents] = useState<RewardEvent[]>([]);
  const [swapEvents, setSwapEvents] = useState<SwapEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Process CoinMarketRewardsV4 events
  const processCoinMarketReward = useCallback((logs: Log[]) => {
    logs.forEach((log) => {
      try {
        const { args } = log as any;
        if (args && coinAddress && args.coin?.toLowerCase() === coinAddress.toLowerCase()) {
          const creatorReward = formatEther(args.creatorReward || BigInt(0));
          const createReferralReward = formatEther(args.createReferralReward || BigInt(0));
          const tradeReferralReward = formatEther(args.tradeReferralReward || BigInt(0));
          const protocolReward = formatEther(args.protocolReward || BigInt(0));

          // Update accumulated rewards
          setRewardData(prev => ({
            ...prev,
            creatorRewards: (parseFloat(prev.creatorRewards) + parseFloat(creatorReward)).toString(),
            createReferralRewards: (parseFloat(prev.createReferralRewards) + parseFloat(createReferralReward)).toString(),
            tradeReferralRewards: (parseFloat(prev.tradeReferralRewards) + parseFloat(tradeReferralReward)).toString(),
            protocolRewards: (parseFloat(prev.protocolRewards) + parseFloat(protocolReward)).toString(),
            lastUpdated: Date.now()
          }));

          // Add to reward events
          const rewardEvent: RewardEvent = {
            transactionHash: log.transactionHash!,
            blockNumber: Number(log.blockNumber),
            timestamp: Date.now(),
            eventType: 'CoinMarketRewardsV4',
            recipient: args.creator,
            amount: creatorReward,
            currency: 'ETH',
            coinAddress: coinAddress
          };

          setRewardEvents(prev => [rewardEvent, ...prev].slice(0, 50)); // Keep last 50 events
        }
      } catch (error) {
        console.error('Error processing CoinMarketRewardsV4 event:', error);
      }
    });
  }, [coinAddress]);

  // Process CoinTradeRewards events
  const processCoinTradeReward = useCallback((logs: Log[]) => {
    logs.forEach((log) => {
      try {
        const { args } = log as any;
        if (args && coinAddress && args.coin?.toLowerCase() === coinAddress.toLowerCase()) {
          const tradeReferralReward = formatEther(args.tradeReferralReward || BigInt(0));

          // Update trade referral rewards
          setRewardData(prev => ({
            ...prev,
            tradeReferralRewards: (parseFloat(prev.tradeReferralRewards) + parseFloat(tradeReferralReward)).toString(),
            lastUpdated: Date.now()
          }));

          // Add to reward events
          const rewardEvent: RewardEvent = {
            transactionHash: log.transactionHash!,
            blockNumber: Number(log.blockNumber),
            timestamp: Date.now(),
            eventType: 'CoinTradeRewards',
            recipient: args.tradeReferral,
            amount: tradeReferralReward,
            currency: 'ETH',
            coinAddress: coinAddress
          };

          setRewardEvents(prev => [rewardEvent, ...prev].slice(0, 50));
        }
      } catch (error) {
        console.error('Error processing CoinTradeRewards event:', error);
      }
    });
  }, [coinAddress]);

  // Process Swap events for volume tracking
  const processSwapEvent = useCallback((logs: Log[]) => {
    logs.forEach((log) => {
      try {
        const { args } = log as any;
        if (args && poolAddress) {
          const amount0 = formatEther(args.amount0 ? BigInt(Math.abs(Number(args.amount0))) : BigInt(0));
          const amount1 = formatEther(args.amount1 ? BigInt(Math.abs(Number(args.amount1))) : BigInt(0));

          // Calculate volume (use the non-zero amount as volume indicator)
          const volume = parseFloat(amount0) > 0 ? amount0 : amount1;

          // Update total volume
          setRewardData(prev => ({
            ...prev,
            totalVolume: (parseFloat(prev.totalVolume) + volume).toString(),
            lastUpdated: Date.now()
          }));

          // Add to swap events
          const swapEvent: SwapEvent = {
            transactionHash: log.transactionHash!,
            blockNumber: Number(log.blockNumber),
            timestamp: Date.now(),
            amount0In: amount0,
            amount1In: amount1,
            amount0Out: '0',
            amount1Out: '0',
            to: args.to || args.sender,
            fee: '0'
          };

          setSwapEvents(prev => [swapEvent, ...prev].slice(0, 50));
        }
      } catch (error) {
        console.error('Error processing Swap event:', error);
      }
    });
  }, [poolAddress]);

  // Watch for CoinMarketRewardsV4 events
  useWatchContractEvent({
    address: coinAddress,
    abi: [COIN_MARKET_REWARDS_V4_ABI],
    eventName: 'CoinMarketRewardsV4',
    onLogs: processCoinMarketReward,
    enabled: enabled && !!coinAddress
  });

  // Watch for CoinTradeRewards events
  useWatchContractEvent({
    address: coinAddress,
    abi: [COIN_TRADE_REWARDS_ABI],
    eventName: 'CoinTradeRewards',
    onLogs: processCoinTradeReward,
    enabled: enabled && !!coinAddress
  });

  // Watch for Swap events on the pool
  useWatchContractEvent({
    address: poolAddress,
    abi: [SWAP_ABI],
    eventName: 'Swap',
    onLogs: processSwapEvent,
    enabled: enabled && !!poolAddress
  });

  // Fetch historical reward data
  const fetchHistoricalRewards = useCallback(async () => {
    if (!coinAddress || !publicClient) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get historical CoinMarketRewardsV4 events
      const marketRewardLogs = await publicClient.getLogs({
        address: coinAddress,
        event: COIN_MARKET_REWARDS_V4_ABI,
        fromBlock: 'earliest',
        toBlock: 'latest'
      });

      // Get historical CoinTradeRewards events
      const tradeRewardLogs = await publicClient.getLogs({
        address: coinAddress,
        event: COIN_TRADE_REWARDS_ABI,
        fromBlock: 'earliest',
        toBlock: 'latest'
      });

      // Process historical events
      if (marketRewardLogs.length > 0) {
        processCoinMarketReward(marketRewardLogs);
      }

      if (tradeRewardLogs.length > 0) {
        processCoinTradeReward(tradeRewardLogs);
      }

      // Get historical swap events if pool address is available
      if (poolAddress) {
        const swapLogs = await publicClient.getLogs({
          address: poolAddress,
          event: SWAP_ABI,
          fromBlock: 'earliest',
          toBlock: 'latest'
        });

        if (swapLogs.length > 0) {
          processSwapEvent(swapLogs);
        }
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch historical rewards');
      console.error('Error fetching historical rewards:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [coinAddress, poolAddress, publicClient, processCoinMarketReward, processCoinTradeReward, processSwapEvent]);

  // Effect to fetch historical data when coinAddress changes
  useEffect(() => {
    if (coinAddress && enabled) {
      fetchHistoricalRewards();
    }
  }, [coinAddress, enabled, fetchHistoricalRewards]);

  // Calculate reward distribution percentages
  const totalRewards = parseFloat(rewardData.creatorRewards) + 
                      parseFloat(rewardData.createReferralRewards) + 
                      parseFloat(rewardData.tradeReferralRewards) + 
                      parseFloat(rewardData.protocolRewards);

  const rewardPercentages = {
    creator: totalRewards > 0 ? (parseFloat(rewardData.creatorRewards) / totalRewards) * 100 : 0,
    createReferral: totalRewards > 0 ? (parseFloat(rewardData.createReferralRewards) / totalRewards) * 100 : 0,
    tradeReferral: totalRewards > 0 ? (parseFloat(rewardData.tradeReferralRewards) / totalRewards) * 100 : 0,
    protocol: totalRewards > 0 ? (parseFloat(rewardData.protocolRewards) / totalRewards) * 100 : 0
  };

  return {
    rewardData,
    rewardEvents,
    swapEvents,
    rewardPercentages,
    totalRewards: totalRewards.toString(),
    isLoading,
    error,
    refetchHistoricalRewards: fetchHistoricalRewards
  };
}; 