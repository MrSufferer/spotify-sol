"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Address } from 'viem';

import useLoadImage from '@/hooks/useLoadImage';
import { Song } from '@/types';
import usePlayer from '@/hooks/usePlayer';
import PlayButton from './PlayButton';
import LikeButton from './LikeButton';
import { TradingInterface } from './TradingInterface';

interface SongItemProps {
  data: Song;
  onClick: (id: string) => void;
}

const SongItem = ({ data, onClick }: SongItemProps) => {
  const player = usePlayer();
  const router = useRouter();
  const imagePath = useLoadImage(data);
  const [showTrading, setShowTrading] = useState(false);

  const handleClick = () => {
    onClick(data.id);
  };

  return (
    <div className="relative group flex flex-col items-center justify-center rounded-md overflow-hidden gap-x-4 bg-neutral-400/5 cursor-pointer hover:bg-neutral-400/10 transition p-3">
      <div className="relative aspect-square w-full h-full rounded-md overflow-hidden">
        <Image
          className="object-cover"
          src={imagePath || '/images/liked.png'}
          fill
          alt="Image"
        />
      </div>
      <div className="flex flex-col items-start w-full pt-4 gap-y-1">
        <p className="font-semibold truncate w-full">{data.title}</p>
        <p className="text-neutral-400 text-sm pb-4 w-full truncate">By {data.author}</p>
      </div>
      <div className="absolute bottom-24 right-5">
        <PlayButton />
      </div>
      <div className="absolute bottom-5 right-5">
        <LikeButton songId={data.id} />
      </div>
      {data.coin_address && (
        <div className="absolute bottom-5 left-5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTrading(!showTrading);
            }}
            className="text-neutral-400 hover:text-white transition"
          >
            Trade Coin
          </button>
        </div>
      )}
      {showTrading && data.coin_address && (
        <div 
          className="absolute z-10 bottom-20 left-0 right-0 mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <TradingInterface 
            tokenAddress={data.coin_address as Address} 
            tokenSymbol={`${data.title} Coin`}
          />
        </div>
      )}
    </div>
  );
};

export default SongItem;