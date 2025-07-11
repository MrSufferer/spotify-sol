"use client"

import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import uniqid from "uniqid";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { isAddress } from "viem";

import useUploadModal from "@/hooks/useUploadModal";
import { useCreateCoin, POOL_CONFIGS } from "@/hooks/useCreateCoin";
import Modal from "./Modal";
import Input from "./Input";
import Button from "./Button";
import { useUser } from "@/hooks/useUser";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

const UploadModal = () => {
    const [isLoading, setIsLoading] = useState(false);
    const uploadModal = useUploadModal();
    const { user } = useUser();
    const { address } = useAccount();
    const supabaseClient = useSupabaseClient();
    const router = useRouter();
    const { create: createCoin, isLoading: isCreatingCoin } = useCreateCoin();

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
        setValue,
        getValues
    } = useForm<FieldValues>({
        defaultValues: {
            author: '',
            title: '',
            song: null,
            image: null,
            createCoin: false,
            coinSymbol: '',
            initialPurchaseAmount: '0.01',
            poolType: 'STANDARD_MUSIC', // Default pool type
            payoutRecipient: '', // New field for payout recipient
            useCustomPayoutRecipient: false, // Toggle for custom payout recipient
            additionalOwners: [] // Array of additional owner addresses
        }
    })

    const onChange = (open: boolean) => {
        if (!open) {
            reset();
            uploadModal.onClose();
        }
    }

    // Validate payout recipient address
    const validatePayoutRecipient = (value: string) => {
        if (!value) return "Payout recipient address is required";
        if (!isAddress(value)) return "Invalid Ethereum address";
        return true;
    };

    // Validate owner address
    const validateOwnerAddress = (value: string) => {
        if (!value) return "Owner address is required";
        if (!isAddress(value)) return "Invalid Ethereum address";
        return true;
    };

    // Add additional owner
    const addAdditionalOwner = () => {
        const currentOwners = getValues('additionalOwners') || [];
        const newOwnerAddress = getValues('newOwnerAddress');
        
        if (!newOwnerAddress || !isAddress(newOwnerAddress)) {
            toast.error('Please enter a valid Ethereum address');
            return;
        }
        
        // Check for duplicates
        const existingOwners = [address, getValues('payoutRecipient'), ...currentOwners];
        if (existingOwners.includes(newOwnerAddress)) {
            toast.error('This address is already an owner');
            return;
        }
        
        setValue('additionalOwners', [...currentOwners, newOwnerAddress]);
        setValue('newOwnerAddress', ''); // Clear the input
        toast.success('Owner added successfully');
    };

    // Remove additional owner
    const removeAdditionalOwner = (indexToRemove: number) => {
        const currentOwners = getValues('additionalOwners') || [];
        const updatedOwners = currentOwners.filter((_: string, index: number) => index !== indexToRemove);
        setValue('additionalOwners', updatedOwners);
        toast.success('Owner removed successfully');
    };

    const onSubmit: SubmitHandler<FieldValues> = async (values) => {
        try {
            setIsLoading(true);

            const imageFile = values.image?.[0];
            const songFile = values.song?.[0];

            if (!imageFile || !songFile || !user) {
                toast.error("Missing field");
                return;
            }

            // Validate payout recipient if creating coin
            if (values.createCoin) {
                const payoutRecipient = values.useCustomPayoutRecipient === "true" ? values.payoutRecipient : address;
                if (!payoutRecipient || !isAddress(payoutRecipient)) {
                    toast.error("Invalid payout recipient address");
                    return;
                }
                
                // Validate additional owners
                if (values.additionalOwners && values.additionalOwners.length > 0) {
                    for (const owner of values.additionalOwners) {
                        if (!isAddress(owner)) {
                            toast.error(`Invalid owner address: ${owner}`);
                            return;
                        }
                    }
                }
            }

            const uniqueID = uniqid();

            // Upload song
            const {
                data: songData,
                error: songError,
            } = await supabaseClient
                .storage
                .from('songs')
                .upload(`song-${values.title}-${uniqueID}`, songFile, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (songError) {
                setIsLoading(false);
                return toast.error('Failed song upload.');
            }

            // Upload image
            const {
                data: imageData,
                error: imageError,
            } = await supabaseClient
                .storage
                .from('images')
                .upload(`image-${values.title}-${uniqueID}`, imageFile, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (imageError) {
                setIsLoading(false);
                return toast.error('Failed image upload.');
            }

            let coinAddress;
            if (values.createCoin && address) {
                try {
                    // Determine payout recipient
                    const payoutRecipient = values.useCustomPayoutRecipient === "true" ? values.payoutRecipient : address;
                    
                    // Create coin for the song using metadata-aware creation
                    const result = await createCoin({
                        name: values.title,
                        symbol: values.coinSymbol || values.title.slice(0, 5).toUpperCase(),
                        description: `Fan token for ${values.title} by ${values.author}`,
                        image: imageFile,
                        payoutRecipient: payoutRecipient as `0x${string}`,
                        initialPurchaseAmount: values.initialPurchaseAmount,
                        poolType: values.poolType,
                        additionalOwners: values.additionalOwners || [] // Include additional owners
                    });
                    coinAddress = result.address;
                    
                    const totalOwners = 2 + (values.additionalOwners?.length || 0); // Creator + payout recipient + additional
                    toast.success(`Coin created successfully with ${totalOwners} owners! Payout recipient: ${payoutRecipient}`);
                } catch (error) {
                    console.error('Failed to create coin:', error);
                    toast.error('Failed to create coin. Song will be uploaded without a coin.');
                }
            }

            const {
                error: supabaseError
            } = await supabaseClient
                .from('songs')
                .insert({
                    user_id: user.id,
                    title: values.title,
                    author: values.author,
                    image_path: imageData.path,
                    song_path: songData.path,
                    coin_address: coinAddress
                })

            if (supabaseError) {
                setIsLoading(false);
                return toast.error(supabaseError.message);
            }

            router.refresh();
            setIsLoading(false);
            toast.success('Song created!');
            reset();
            uploadModal.onClose();
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    }

    const createCoinEnabled = watch('createCoin');
    const useCustomPayoutRecipient = watch('useCustomPayoutRecipient');
    const additionalOwners = watch('additionalOwners');

    // Auto-set payout recipient to connected address when not using custom
    if (createCoinEnabled && useCustomPayoutRecipient !== "true" && address) {
        setValue('payoutRecipient', address);
    }

    return (
        <Modal
            title="Add a song"
            description="Upload an mp3 file and optionally create a fan token"
            isOpen={uploadModal.isOpen}
            onChange={onChange}
        >
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-y-4"
            >
                <Input 
                    id="title"
                    disabled={isLoading}
                    {...register('title', { required: true })}
                    placeholder='Song title'
                />
                <Input 
                    id="author"
                    disabled={isLoading}
                    {...register('author', { required: true })}
                    placeholder='Song author'
                />
                <div>
                    <div className="pb-1">
                        Select a song file
                    </div>
                    <Input 
                        id="song"
                        type="file"
                        disabled={isLoading}
                        accept=".mp3"
                        {...register('song', { required: true })}
                    />
                </div>
                <div>
                    <div className="pb-1">
                        Select an image
                    </div>
                    <Input 
                        id="image"
                        type="file"
                        disabled={isLoading}
                        accept="image/*"
                        {...register('image', { required: true })}
                    />
                </div>
                {address && (
                    <div className="flex flex-col gap-y-2">
                        <div className="flex items-center gap-x-2">
                            <input
                                type="checkbox"
                                id="createCoin"
                                {...register('createCoin')}
                                className="h-4 w-4"
                            />
                            <label htmlFor="createCoin">
                                Create fan token for this song
                            </label>
                        </div>
                        {createCoinEnabled && (
                            <>
                                <Input 
                                    id="coinSymbol"
                                    disabled={isLoading}
                                    {...register('coinSymbol')}
                                    placeholder='Token symbol (optional)'
                                />
                                
                                {/* Payout Recipient Management */}
                                <div className="flex flex-col gap-y-2">
                                    <label className="text-sm font-medium text-white">
                                        Payout Recipient (receives 50% of creator earnings)
                                    </label>
                                    <div className="flex items-center gap-x-2">
                                        <input
                                            type="radio"
                                            id="useMyAddress"
                                            value="false"
                                            {...register('useCustomPayoutRecipient')}
                                            className="h-4 w-4"
                                        />
                                        <label htmlFor="useMyAddress" className="text-sm">
                                            Use my address ({address?.slice(0, 6)}...{address?.slice(-4)})
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-x-2">
                                        <input
                                            type="radio"
                                            id="useCustomAddress"
                                            value="true"
                                            {...register('useCustomPayoutRecipient')}
                                            className="h-4 w-4"
                                        />
                                        <label htmlFor="useCustomAddress" className="text-sm">
                                            Use custom address
                                        </label>
                                    </div>
                                    {useCustomPayoutRecipient === "true" && (
                                        <div className="flex flex-col gap-y-1">
                                            <Input 
                                                id="payoutRecipient"
                                                disabled={isLoading}
                                                {...register('payoutRecipient', { 
                                                    required: useCustomPayoutRecipient === "true" ? "Payout recipient address is required" : false,
                                                    validate: useCustomPayoutRecipient === "true" ? validatePayoutRecipient : undefined
                                                })}
                                                placeholder='0x...'
                                            />
                                            {errors.payoutRecipient && (
                                                <span className="text-red-500 text-sm">
                                                    {errors.payoutRecipient.message as string}
                                                </span>
                                            )}
                                            <p className="text-xs text-neutral-400">
                                                This address will receive 50% of all creator earnings from coin trading
                                            </p>
                                        </div>
                                    )}
                                </div>

                                                                 {/* Additional Owners Management */}
                                 <div className="flex flex-col gap-y-2">
                                     <label className="text-sm font-medium text-white">
                                         Additional Owners (can manage coin settings)
                                     </label>
                                     <p className="text-xs text-neutral-400">
                                         Additional owners can update metadata, payout recipients, and other coin settings alongside the creator.
                                     </p>
                                    <div className="flex items-center gap-x-2">
                                        <input
                                            type="text"
                                            id="newOwnerAddress"
                                            {...register('newOwnerAddress', { validate: validateOwnerAddress })}
                                            placeholder="Enter new owner address"
                                            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-300"
                                        />
                                        <Button
                                            onClick={addAdditionalOwner}
                                            disabled={isLoading}
                                            type="button"
                                        >
                                            Add Owner
                                        </Button>
                                    </div>
                                    {additionalOwners && additionalOwners.length > 0 && (
                                        <div className="flex flex-col gap-y-1">
                                            <p className="text-xs text-neutral-500">Current Additional Owners:</p>
                                            {additionalOwners.map((owner: string, index: number) => (
                                                <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                                    <span className="text-sm text-neutral-600 dark:text-neutral-300">{owner}</span>
                                                    <Button
                                                        onClick={() => removeAdditionalOwner(index)}
                                                        disabled={isLoading}
                                                        type="button"
                                                        className="text-red-500 hover:text-red-700 text-xs"
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-y-2">
                                    <label htmlFor="poolType" className="text-sm font-medium">
                                        Pool Configuration
                                    </label>
                                    <select
                                        id="poolType"
                                        {...register('poolType')}
                                        disabled={isLoading}
                                        className="
                                            block
                                            w-full
                                            rounded-md
                                            border
                                            border-gray-300
                                            bg-white
                                            px-3
                                            py-2
                                            text-sm
                                            placeholder-gray-400
                                            focus:border-indigo-500
                                            focus:outline-none
                                            focus:ring-indigo-500
                                            dark:border-gray-600
                                            dark:bg-gray-700
                                            dark:text-white
                                            dark:placeholder-gray-300
                                        "
                                    >
                                        <option value="STANDARD_MUSIC">
                                            Standard Music (0.05% fee, balanced liquidity)
                                        </option>
                                        <option value="HIGH_ACTIVITY">
                                            High Activity (0.03% fee, tight spreads)
                                        </option>
                                        <option value="CONSERVATIVE">
                                            Conservative (0.1% fee, wide spreads)
                                        </option>
                                    </select>
                                    <div className="text-xs text-neutral-400">
                                        {watch('poolType') === 'STANDARD_MUSIC' && (
                                            <p>Recommended for most music tokens. Balanced fee structure with moderate liquidity positions.</p>
                                        )}
                                        {watch('poolType') === 'HIGH_ACTIVITY' && (
                                            <p>For popular content expected to have high trading volume. Lower fees encourage more trading.</p>
                                        )}
                                        {watch('poolType') === 'CONSERVATIVE' && (
                                            <p>For stable content with predictable demand. Higher fees with concentrated liquidity.</p>
                                        )}
                                    </div>
                                </div>
                                <Input 
                                    id="initialPurchaseAmount"
                                    type="number"
                                    step="0.01"
                                    disabled={isLoading}
                                    {...register('initialPurchaseAmount')}
                                    placeholder='Initial purchase amount in ETH'
                                />
                                <p className="text-sm text-neutral-400">
                                    Initial purchase amount in ETH to seed liquidity pool. Default: 0.01 ETH
                                </p>
                            </>
                        )}
                    </div>
                )}
                <Button 
                    disabled={isLoading || isCreatingCoin} 
                    type="submit"
                >
                    Create{isLoading || isCreatingCoin ? 'ing...' : ''}
                </Button>
            </form>
        </Modal>
    );
}

export default UploadModal;