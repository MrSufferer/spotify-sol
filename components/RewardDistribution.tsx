"use client";

import React from 'react';
import { Address } from 'viem';
import { useRewardDistribution } from '@/hooks/useRewardDistribution';
import { FiTrendingUp, FiDollarSign, FiUsers, FiActivity } from 'react-icons/fi';

interface RewardDistributionProps {
  coinAddress?: Address;
  poolAddress?: Address;
  compact?: boolean;
  className?: string;
}

const RewardDistribution: React.FC<RewardDistributionProps> = ({
  coinAddress,
  poolAddress,
  compact = false,
  className = ""
}) => {
  const {
    rewardData,
    rewardPercentages,
    totalRewards,
    isLoading,
    error
  } = useRewardDistribution({ coinAddress, poolAddress });

  if (!coinAddress) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-neutral-300 rounded w-full mb-2"></div>
        <div className="h-4 bg-neutral-300 rounded w-3/4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        Error loading reward data
      </div>
    );
  }

  const hasRewards = parseFloat(totalRewards) > 0;

  if (compact) {
    return (
      <div className={`flex items-center justify-between text-sm ${className}`}>
        <div className="flex items-center gap-2">
          <FiTrendingUp className="h-4 w-4 text-green-500" />
          <span className="font-medium">
            {hasRewards ? `${parseFloat(totalRewards).toFixed(4)} ETH` : "No rewards yet"}
          </span>
        </div>
        {hasRewards && (
          <div className="flex items-center gap-1 text-neutral-400">
            <FiActivity className="h-3 w-3" />
            <span>{parseFloat(rewardData.totalVolume).toFixed(2)} ETH volume</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FiDollarSign className="h-5 w-5 text-green-500" />
          Reward Distribution
        </h3>
        {hasRewards && (
          <div className="text-sm text-neutral-400">
            Total: {parseFloat(totalRewards).toFixed(4)} ETH
          </div>
        )}
      </div>

      {!hasRewards ? (
        <div className="text-center py-8 text-neutral-400">
          <FiActivity className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No trading activity yet</p>
          <p className="text-sm mt-1">Rewards will appear when trading begins</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Creator Rewards */}
          <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                 <FiUsers className="h-5 w-5 text-green-500" />
                 <span className="font-medium">Creator Earnings</span>
               </div>
              <div className="text-right">
                <div className="font-semibold text-green-600">
                  {parseFloat(rewardData.creatorRewards).toFixed(4)} ETH
                </div>
                <div className="text-sm text-neutral-400">
                  {rewardPercentages.creator.toFixed(1)}% of total
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-neutral-500">
              50% of all trading fees go to the creator
            </div>
          </div>

          {/* Platform Rewards */}
                       <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-lg p-4">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <FiTrendingUp className="h-5 w-5 text-blue-500" />
                   <span className="font-medium">Platform Earnings</span>
                 </div>
              <div className="text-right">
                <div className="font-semibold text-blue-600">
                  {(parseFloat(rewardData.createReferralRewards) + parseFloat(rewardData.tradeReferralRewards)).toFixed(4)} ETH
                </div>
                <div className="text-sm text-neutral-400">
                  {(rewardPercentages.createReferral + rewardPercentages.tradeReferral).toFixed(1)}% of total
                </div>
              </div>
            </div>
            <div className="mt-2 space-y-1 text-sm text-neutral-500">
              <div>Create referral: {parseFloat(rewardData.createReferralRewards).toFixed(4)} ETH (15%)</div>
              <div>Trade referral: {parseFloat(rewardData.tradeReferralRewards).toFixed(4)} ETH (15%)</div>
            </div>
          </div>

          {/* Protocol Rewards */}
          <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                 <FiActivity className="h-5 w-5 text-purple-500" />
                 <span className="font-medium">Protocol Earnings</span>
               </div>
              <div className="text-right">
                <div className="font-semibold text-purple-600">
                  {parseFloat(rewardData.protocolRewards).toFixed(4)} ETH
                </div>
                <div className="text-sm text-neutral-400">
                  {rewardPercentages.protocol.toFixed(1)}% of total
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-neutral-500">
              20% goes to Zora protocol treasury
            </div>
          </div>

          {/* Trading Volume */}
          <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                 <FiTrendingUp className="h-5 w-5 text-orange-500" />
                 <span className="font-medium">Trading Volume</span>
               </div>
              <div className="text-right">
                <div className="font-semibold text-orange-600">
                  {parseFloat(rewardData.totalVolume).toFixed(4)} ETH
                </div>
                <div className="text-sm text-neutral-400">
                  Total volume traded
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-neutral-500">
              All-time trading volume for this coin
            </div>
          </div>
        </div>
      )}

      {/* Last Updated */}
      {rewardData.lastUpdated > 0 && (
        <div className="text-xs text-neutral-400 text-center">
          Last updated: {new Date(rewardData.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default RewardDistribution; 