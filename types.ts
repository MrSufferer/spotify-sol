import Stripe from "stripe";
import { Address } from 'viem';

export interface Song {
    id: string;
    user_id: string;
    author: string;
    title: string;
    song_path: string;
    image_path: string;
    // New CoinV4 fields for reward tracking
    coin_address?: Address;
    pool_key?: Address;
    currency?: Address;
    platform_referrer?: Address;
    payout_recipient?: Address;
    contract_uri?: string;
}

// CoinV4 Reward Distribution Types
export interface CoinRewardData {
    creatorRewards: string;      // Creator earnings (50%)
    createReferralRewards: string; // Platform earnings from coin creation (15%)
    tradeReferralRewards: string;  // Platform earnings from trading (15%)
    protocolRewards: string;     // Zora protocol earnings (20%)
    totalVolume: string;         // Total trading volume
    lastUpdated: number;         // Timestamp of last update
}

export interface SwapEvent {
    transactionHash: string;
    blockNumber: number;
    timestamp: number;
    amount0In: string;
    amount1In: string;
    amount0Out: string;
    amount1Out: string;
    to: string;
    fee: string;
}

export interface RewardEvent {
    transactionHash: string;
    blockNumber: number;
    timestamp: number;
    eventType: 'CoinMarketRewardsV4' | 'CoinTradeRewards' | 'CoinTransfer';
    recipient: string;
    amount: string;
    currency: string;
    coinAddress: string;
}

export interface UserDetails {
    id: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    avatar_url?: string;
    billing_address?: string;
    payment_method?: string;
}

export interface Product {
    id: string;
    active?: boolean;
    name?: string;
    description?: string;
    image?: string;
    metadata?: Record<string, any>;
}

export interface Price {
    id: string;
    product_id?: string;
    active?: boolean;
    description?: string;
    unit_amount?: number;
    currency?: string;
    type?: string;
    interval?: string;
    interval_count?: number;
    trial_period_days?: number | null;
    metadata?: Record<string, any>;
    products?: Product;
}

export interface Subscription {
    id: string;
    user_id: string;
    status?: string;
    metadata?: Record<string, any>;
    price_id?: string;
    quantity?: number;
    cancel_at_period_end?: boolean;
    created: string;
    current_period_start: string;
    current_period_end: string;
    ended_at?: string;
    cancel_at?: string;
    canceled_at?: string;
    trial_start?: string;
    trial_end?: string;
    prices?: Price;
}

export interface ProductWithPrice extends Product {
  prices?: Price[];
}