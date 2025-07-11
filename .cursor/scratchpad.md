# Web3 Migration Project: Spotify-like Music Platform to Zora Coins Integration

## Background and Motivation

We are migrating a Spotify-like music streaming application from Web2 to Web3 by integrating Zora Coins V4 contract for tokenization. The current application is built with:

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Supabase for authentication and database
- **Features**: Song upload, playbook, search, liked songs, user authentication
- **Current Architecture**: Traditional web2 with centralized data storage

**Goal**: Create a SIMPLE functional demo that properly implements Zora Coins V4 features and requirements.

## CoinV4 Features → Existing Components Mapping

### 🎯 **Direct Integration Points**

#### **1. Header.tsx** → **Wallet Connection for CoinV4**
- **Current**: Has login/logout with Supabase auth
- **CoinV4 Integration**: Add wallet connect button alongside existing auth
- **Required Functions**: Need wallet to call `setPayoutRecipient()`, `setContractURI()`, factory functions
- **UI Enhancement**: Show connected wallet address, network status

#### **2. UploadModal.tsx** → **Coin Creation with Metadata**
- **Current**: Collects (title, author, mp3, image) and uploads to Supabase
- **CoinV4 Integration**: 
  - Add coin creation form fields (coin name, symbol, initial supply)
  - Implement `PoolConfiguration` setup (fee tier, tick spacing)
  - Call factory.createCoin() with proper metadata URI
  - Set artist as payout recipient via `setPayoutRecipient()`
  - Enable multi-ownership (platform + artist)
- **UI Enhancement**: "Create Artist Coin" checkbox/section in existing form

#### **3. SongItem.tsx** → **Coin Data Display & Trading**
- **Current**: Shows (title, author, image, play button)
- **CoinV4 Integration**:
  - Display coin address, pool key from `getPoolKey()`
  - Show real-time price from Uniswap V4 pool
  - Add "Buy/Sell Coin" buttons
  - Monitor `Swapped` events for trading activity
  - Display `CoinMarketRewardsV4` data (creator rewards)
- **UI Enhancement**: Coin info section below existing song info

#### **4. Player.tsx & PlayerContent.tsx** → **Real-time Coin Performance**
- **Current**: Shows currently playing song with controls
- **CoinV4 Integration**:
  - Display live coin price while song plays
  - Show recent trading activity via hook events
  - Real-time reward distribution data
  - "Invest in Artist" CTA during playback
- **UI Enhancement**: Coin ticker/performance overlay

#### **5. Types.ts** → **Extended Song Interface**
```typescript
interface Song {
  // Existing fields
  id: string;
  user_id: string;
  author: string;
  title: string;
  song_path: string;
  image_path: string;
  
  // New CoinV4 fields
  coin_address?: string;
  pool_key?: string;
  currency?: string;
  platform_referrer?: string;
  payout_recipient?: string;
  contract_uri?: string;
}
```

#### **6. PageContent.tsx** → **Coin Performance Grid**
- **Current**: Grid layout showing all songs
- **CoinV4 Integration**:
  - Sort by coin performance (price change, volume)
  - Show "trending coins" section
  - Display market cap, trading volume for each song/coin
- **UI Enhancement**: Coin metrics in song cards

### 🔄 **Hook Events Integration**

#### **Real-time Data from CoinV4 Events:**
- **`Swapped`** → Update song/coin prices in SongItem components
- **`CoinMarketRewardsV4`** → Show artist earnings in real-time
- **`CoinTradeRewards`** → Display platform revenue from referrals
- **`CoinTransfer`** → Track coin ownership changes

## Key Challenges and Analysis

### Essential Zora Documentation References
**⚠️ EXECUTOR MUST READ THESE FIRST BEFORE EACH TASK:**
- [Zora Coins SDK - Create Coin](https://docs.zora.co/coins/sdk/create-coin)
- [Zora Coin Factory Contract](https://docs.zora.co/coins/contracts/factory) 
- [Zora CoinV4 Contract](https://docs.zora.co/coins/contracts/coin)

### CoinV4.sol Features Requirements (from official docs)

#### Core CoinV4 Architecture:
- **ERC20 + Uniswap V4**: Each coin gets automatic liquidity pool with ZoraV4CoinHook
- **Multi-ownership**: Multiple owners can manage coins (`MultiOwnable`)
- **Metadata Management**: Updatable contract metadata via URI (`setContractURI`)
- **Automatic Hook System**: `ZoraV4CoinHook` handles fee collection and reward distribution

#### Required Reward Distribution (Built-in):
- **Creator**: 50% (`CREATOR_REWARD_BPS = 5000`) → Artists
- **Create Referral**: 15% (`CREATE_REFERRAL_REWARD_BPS = 1500`) → Our platform 
- **Trade Referral**: 15% (`TRADE_REFERRAL_REWARD_BPS = 1500`) → Our platform per trade
- **Protocol**: 20% → Zora treasury (remainder)
- **Doppler**: 5% (`DOPPLER_REWARD_BPS = 500`) → Governance

#### Pool Configuration Requirements:
- Custom `PoolConfiguration` with fee tier, tick spacing, liquidity positions
- Support for multiple liquidity positions and market curves
- Proper pool key management (`getPoolKey()`, `getPoolConfiguration()`)

#### Multi-Hop Swap Paths:
- `getPayoutSwapPath()` for complex reward distribution
- Support for coins paired with other coins (Content Coin → Backing Coin → USDC)

### Integration Strategy
**Enhance existing components with CoinV4 features rather than building from scratch:**
1. Extend UploadModal for coin creation with proper metadata
2. Enhance SongItem with coin data and trading interface
3. Add wallet connection to existing Header auth flow
4. Integrate real-time coin data into Player components
5. Update Types to include coin-related fields

## High-level Task Breakdown

### Phase 1: CoinV4 Contract Integration
- [ ] **Task 1.1**: Setup wagmi with proper CoinV4 contract ABIs
  - Success Criteria: Can interact with CoinV4 functions (getPoolKey, hooks, etc.)
- [ ] **Task 1.2**: Implement coin factory integration with proper parameters
  - Success Criteria: Can call factory.createCoin() with PoolConfiguration
- [ ] **Task 1.3**: Add proper metadata URI management
  - Success Criteria: Can set/update contract metadata via setContractURI

### Phase 2: CoinV4 Feature Implementation
- [ ] **Task 2.1**: Implement pool configuration setup
  - Success Criteria: Proper PoolConfiguration with fee tier, tick spacing
- [ ] **Task 2.2**: Add payout recipient management
  - Success Criteria: Can set artist as payout recipient via setPayoutRecipient
- [ ] **Task 2.3**: Implement multi-ownership support
  - Success Criteria: Platform and artist both have ownership permissions
- [ ] **Task 2.4**: Add reward distribution monitoring
  - Success Criteria: Can track CoinMarketRewardsV4 and CoinTradeRewards events

### Phase 3: Hook System Integration
- [ ] **Task 3.1**: Monitor hook events (Swapped, CoinMarketRewardsV4)
  - Success Criteria: Display real-time swap and reward data
- [ ] **Task 3.2**: Implement swap path configuration for multi-hop rewards
  - Success Criteria: Proper getPayoutSwapPath setup for coin-to-coin pairs
- [ ] **Task 3.3**: Add automatic reward tracking
  - Success Criteria: Show creator/platform/trade referral rewards

## Project Status Board

### 🔴 In Progress
- Task 3.3: Add automatic reward tracking

### ⏳ Pending
None

### ✅ Completed
- [x] CoinV4 documentation analysis
- [x] Feature requirements identification
- [x] Component mapping analysis
- [x] Initial Web3 setup with correct dependencies
- [x] Integrated Web3Provider into app layout
- [x] Created useCreateCoin hook for Zora Coins SDK
- [x] Updated UploadModal with coin creation UI
- [x] Added coin_address to database schema
- [x] Implemented proper factory integration with initial purchase setup
- [x] Added multi-owner support in coin creation
- [x] Task 1.3: Added proper metadata URI management
  - Created useCreateMetadata hook with Zora's builder
  - Implemented IPFS upload via Zora's uploader
  - Added metadata validation and error handling
  - Enhanced UploadModal with proper file handling
- [x] Task 2.1: Implemented pool configuration setup
  - Added PoolConfiguration interface with version, fee tier, tick spacing
  - Created predefined pool configurations (STANDARD_MUSIC, HIGH_ACTIVITY, CONSERVATIVE)
  - Enhanced useCreateCoin hook with pool configuration parameters
  - Added pool type selection in UploadModal with descriptive options
  - Configured proper CoinV4 deployment with advanced pool features
- [x] Task 2.2: Added payout recipient management
  - Enhanced UploadModal with payout recipient selection UI
  - Added radio buttons for "Use my address" vs "Use custom address"
  - Implemented address validation using viem's isAddress function
  - Added form validation and error handling for payout recipient
  - Updated useCreateCoin hook to handle custom payout recipients
  - Added informative text about 50% creator earnings distribution
  - Improved user feedback with payout recipient confirmation in success message
- [x] Task 2.3: Implemented multi-ownership support
  - Enhanced CreateCoinParams interface to accept additionalOwners array
  - Updated useCreateCoin hook to handle multiple owners with duplicate prevention
  - Added comprehensive multi-owner management UI in UploadModal
  - Implemented add/remove functionality for additional owners
  - Added address validation for all owner addresses
  - Created reactive UI that shows current owners list
  - Added informative text about owner permissions and responsibilities
  - Enhanced success message to show total number of owners
  - Implemented proper logging for multi-ownership debugging
- [x] Task 2.4: Added reward distribution monitoring
  - Created useRewardDistribution hook to monitor CoinV4 events
  - Implemented real-time tracking of CoinMarketRewardsV4 and CoinTradeRewards events
  - Added Swap event monitoring for trading volume calculation
  - Created RewardDistribution component with compact and full views
  - Integrated reward display into SongItem component for songs with coins
  - Enhanced PlayerContent with live coin performance during playback
  - Added historical reward data fetching with proper error handling
  - Implemented reward percentage calculations and visual indicators
  - Added coin availability badges and real-time updates
- [x] Task 3.1: Added trading functionality and event monitoring
  - Created useSwapCoin hook for handling coin trades using Zora's tradeCoin SDK
  - Implemented proper trade parameters with ETH ↔ ERC20 token swaps
  - Added slippage protection and error handling
  - Created TradingInterface component with buy/sell functionality
  - Integrated trading interface into SongItem and PlayerContent components
  - Added real-time trade status updates with toast notifications
  - Enhanced types with proper coin-related fields
  - Added trading button with coin icon in player controls
- [x] Task 3.2: Implemented swap path configuration for multi-hop rewards
  - Enhanced useSwapPath hook with multi-hop path finding
  - Added support for common intermediary tokens (USDC, WETH, WMATIC)
  - Implemented path optimization considering gas costs and fees
  - Added pool information fetching and simulation
  - Updated useSwapCoin to support multi-hop trades
  - Enhanced TradingInterface with path visualization
  - Added maximum hops selector (1-3 hops)
  - Added detailed gas cost and fee estimates
  - Improved error handling for each hop in the path
  - Added clear visualization of trading paths

### ❌ Cancelled
- Basic coin creation without CoinV4 features

## Current Status / Progress Tracking

**Current Focus**: Moving on to Task 3.3: Add automatic reward tracking

**Completed**:
- ✅ Task 3.2: Implemented swap path configuration for multi-hop rewards
  - Added comprehensive multi-hop trading support
  - Implemented path optimization and visualization
  - Enhanced trading interface with detailed information
  - Added support for up to 3 hops through common tokens

**Next Steps**: 
1. Begin Task 3.3: Add automatic reward tracking
   - Implement real-time reward monitoring
   - Add notification system for rewards
   - Create reward history view
   - Add reward analytics dashboard

**Pending**:
- ⏳ Task 3.3: Add automatic reward tracking and notifications

## Executor's Notes

Successfully completed Task 3.2 with comprehensive multi-hop trading functionality:
- Implemented path finding through common intermediary tokens
- Added gas cost optimization and fee estimation
- Enhanced trading interface with clear path visualization
- Added support for configurable maximum hops
- Improved error handling and transaction feedback

Ready to move on to Task 3.3: Adding automatic reward tracking and notifications.

## Lessons

- CoinV4 is not just an ERC20 - it's ERC20 + Uniswap V4 + Hook system
- Must implement proper PoolConfiguration with fee tiers and tick spacing
- Automatic reward distribution requires proper payout recipient setup
- Multi-ownership allows platform to co-manage coins with artists
- Hook system handles all fee collection and reward distribution automatically
- Need to monitor hook events for real-time trading data
- **Existing components can be enhanced rather than rebuilt from scratch**
- **Song upload flow is perfect place for coin creation**
- **Player components ideal for real-time coin performance display**
- **Use @zoralabs/coins-sdk for Zora Coins V4 integration**
- **Need to set up ZORA_API_KEY for full SDK functionality**
- **Use Zora's metadata builder for proper metadata structure**
- **IPFS upload should use Zora's official uploader**
- **Initial purchase amount helps seed liquidity**
- **File handling needs careful consideration in metadata creation**
- **Payout recipient management is critical for creator earnings distribution**
- **Address validation prevents failed transactions and user confusion**
- **React Hook Form radio buttons require string values, not boolean**
- **User experience benefits from clear explanations of earnings percentages**
- **Form validation should provide immediate feedback for invalid addresses**
- **Multi-ownership enables collaborative token management between platforms and artists**
- **Duplicate prevention is essential for clean ownership structures**
- **CoinV4 MultiOwnable allows multiple addresses to manage coin settings**
- **Owners can update metadata, payout recipients, and other coin configurations**
- **User interface should clearly show current ownership state with reactive updates** 
- **Trading interface should be accessible but not intrusive**
- **Slippage protection is essential for better trading experience**
- **Real-time transaction feedback improves user confidence**
- **Type safety is crucial for trading functionality**
- **Clean UI/UX is important for trading interfaces**
- **Error handling and loading states are essential**
- **Proper event propagation handling prevents UI issues**
- **Trading should be available where users expect it**
- **Transaction confirmation improves reliability**
- **Toast notifications provide good user feedback** 