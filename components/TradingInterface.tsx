import { useState, useEffect } from 'react';
import { useSwapCoin } from '@/hooks/useSwapCoin';
import { useSwapPath } from '@/hooks/useSwapPath';
import Button from './Button';
import Input from './Input';
import { Address, formatEther } from 'viem';
import { toast } from 'react-hot-toast';
import { SwapPathResult } from '@/hooks/useSwapPath';

interface TradingInterfaceProps {
  tokenAddress: Address;
  tokenSymbol: string;
}

export const TradingInterface = ({ tokenAddress, tokenSymbol }: TradingInterfaceProps) => {
  const { swap, isLoading: isSwapLoading } = useSwapCoin();
  const { getOptimalPath, formatPathForDisplay, isLoading: isPathLoading } = useSwapPath();
  const [amount, setAmount] = useState('');
  const [isBuy, setIsBuy] = useState(true);
  const [swapPath, setSwapPath] = useState<SwapPathResult | null>(null);
  const [maxHops, setMaxHops] = useState(2);

  // Update swap path when amount or direction changes
  useEffect(() => {
    const updateSwapPath = async () => {
      if (!amount) {
        setSwapPath(null);
        return;
      }

      try {
        const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address;
        const path = await getOptimalPath({
          fromToken: isBuy ? ETH_ADDRESS : tokenAddress,
          toToken: isBuy ? tokenAddress : ETH_ADDRESS,
          amount,
          slippage: 100, // 1% slippage
          maxHops,
        });

        setSwapPath(path);
      } catch (error) {
        console.error('Error getting swap path:', error);
        toast.error('Failed to get price estimate');
      }
    };

    updateSwapPath();
  }, [amount, isBuy, tokenAddress, getOptimalPath, maxHops]);

  const handleSwap = async () => {
    if (!amount || !swapPath) return;

    await swap({
      tokenAddress,
      amount,
      isBuy,
      slippage: 100, // 1% slippage
      path: swapPath.path,
    });
  };

  const isLoading = isSwapLoading || isPathLoading;

  return (
    <div className="flex flex-col gap-4 p-4 bg-neutral-900 rounded-lg">
      <div className="flex justify-between items-center">
        <h3 className="text-white text-lg font-semibold">Trade {tokenSymbol}</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsBuy(true)}
            className={isBuy ? 'bg-green-500' : 'bg-neutral-700'}
          >
            Buy
          </Button>
          <Button
            onClick={() => setIsBuy(false)}
            className={!isBuy ? 'bg-red-500' : 'bg-neutral-700'}
          >
            Sell
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-neutral-400 text-sm">
          Amount ({isBuy ? 'ETH' : tokenSymbol})
        </label>
        <Input
          type="number"
          placeholder={`Enter amount in ${isBuy ? 'ETH' : tokenSymbol}`}
          value={amount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-neutral-400 text-sm">Maximum Hops</label>
        <div className="flex gap-2">
          {[1, 2, 3].map((hops) => (
            <Button
              key={hops}
              onClick={() => setMaxHops(hops)}
              className={maxHops === hops ? 'bg-blue-500' : 'bg-neutral-700'}
            >
              {hops}
            </Button>
          ))}
        </div>
        <p className="text-xs text-neutral-500">
          More hops may find better rates but cost more gas
        </p>
      </div>

      {swapPath && (
        <div className="flex flex-col gap-2 p-3 bg-neutral-800 rounded-lg">
          <div className="flex justify-between items-center text-sm text-neutral-400">
            <span>Swap Path:</span>
            <span className="text-neutral-300">
              {formatPathForDisplay(swapPath.path, swapPath.intermediaryOutputs)}
            </span>
          </div>
          
          <div className="flex justify-between items-center text-sm text-neutral-400">
            <span>Expected Output:</span>
            <span className="text-neutral-300">
              {formatEther(swapPath.expectedOutput)} {isBuy ? tokenSymbol : 'ETH'}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm text-neutral-400">
            <span>Minimum Output:</span>
            <span className="text-neutral-300">
              {formatEther(swapPath.minOutput)} {isBuy ? tokenSymbol : 'ETH'}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm text-neutral-400">
            <span>Estimated Gas:</span>
            <span className="text-neutral-300">
              {formatEther(swapPath.estimatedGas * BigInt(1e9))} ETH
            </span>
          </div>

          <div className="flex justify-between items-center text-sm text-neutral-400">
            <span>Total Fees:</span>
            <span className="text-neutral-300">
              {formatEther(swapPath.fee)} ETH
            </span>
          </div>

          <p className="text-xs text-neutral-500 mt-2">
            Price includes 1% slippage protection
          </p>
        </div>
      )}

      <Button
        disabled={isLoading || !amount || !swapPath}
        onClick={handleSwap}
        className="w-full bg-blue-500 hover:bg-blue-600"
      >
        {isLoading ? 'Processing...' : `${isBuy ? 'Buy' : 'Sell'} ${tokenSymbol}`}
      </Button>
    </div>
  );
}; 