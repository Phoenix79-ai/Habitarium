// src/pages/RewardsPage.tsx (Using Notifications)

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
// --- Mantine Imports ---
import { Box, Title, Text, Loader, Alert, SimpleGrid, Card, Button, Badge, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications'; // Import notifications hook/object
// --- Icons ---
import { IconAlertCircle, IconShoppingCartPlus, IconCoin, IconCheck } from '@tabler/icons-react'; // Need IconCheck

// Interfaces
interface Reward { id: string; name: string; description: string; costHp: number; }
interface ListRewardsResponse { message: string; rewards: Reward[]; }
interface RedeemResponse { message: string; user?: { hp: number; active_title: string | null; }; }
// Interface for brief user profile needed for refetch attempt
interface UserProfileBrief { hp?: number; active_title?: string | null; }


const RewardsPage: React.FC = () => {
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRedeeming, setIsRedeeming] = useState<string | null>(null); // Track redeeming status by reward ID
    const [error, setError] = useState<string | null>(null); // General page error
    // Remove state for inline redeem message - using notifications now
    // const [redeemMessage, setRedeemMessage] = useState<{ id: string | null, text: string | null, type: 'success' | 'error' }>({ id: null, text: null, type: 'success' });

    // Fetch Available Rewards
    const fetchRewards = useCallback(async () => {
        setIsLoading(true); setError(null);
        console.log("[RewardsPage] Fetching rewards...");
        try {
            const response = await apiClient.get<ListRewardsResponse>('/rewards');
            if (response.data?.rewards && Array.isArray(response.data.rewards)) { setRewards(response.data.rewards); }
            else { setError("Could not load rewards."); }
        } catch (err: any) { const msg = err.response?.data?.message || "Fetch error"; setError(msg); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchRewards(); }, [fetchRewards]);

    // --- Fetch User Profile (for potential HP refresh - needs proper state management for header update) ---
    const fetchUserProfileForHPUpdate = useCallback(async () => {
        console.log("[RewardsPage] Re-fetching user profile after redeem (header HP will not auto-update yet)...");
        try {
            // Fetch profile - the data isn't used directly here but ensures latest data is available for next Dashboard load
            await apiClient.get<{ message: string, user: UserProfileBrief }>('/auth/profile');
            console.log("[RewardsPage] Profile fetched after redeem.");
        } catch (err) {
            console.error("[RewardsPage] Failed to re-fetch profile:", err);
        }
     }, []);

    // Handle Redeeming a Reward (Using Notifications)
    const handleRedeem = async (rewardId: string, cost: number) => {
         setIsRedeeming(rewardId); // Set loading state for this button
         setError(null); // Clear general page error

         console.log(`[RewardsPage] Attempting to redeem reward ID: ${rewardId}`);
         try {
            const response = await apiClient.post<RedeemResponse>(`/rewards/${rewardId}/redeem`);
            console.log(`[RewardsPage] Redeem successful for ${rewardId}:`, response.data);

            // --- Show success notification ---
            notifications.show({
                title: 'Reward Redeemed!',
                message: response.data.message || `Successfully redeemed reward.`,
                color: 'green',
                icon: <IconCheck size={18} />,
                autoClose: 4000, // Slightly longer display
            });

            // Attempt to refresh profile data (for next page load / potential future state management)
            fetchUserProfileForHPUpdate();

         } catch (err: any) {
             const msg = err.response?.data?.message || "Failed to redeem reward";
             console.error(`[RewardsPage] Error redeeming reward ${rewardId}:`, err);
              // --- Show error notification ---
             notifications.show({
                title: 'Redeem Failed',
                message: msg,
                color: 'red',
                icon: <IconAlertCircle size={18} />,
             });
             // Maybe set general error state too? setError(msg);
         } finally {
             setIsRedeeming(null); // Clear loading state for this button
         }
    };


    // --- Render Logic ---
    return (
        <Box>
            <Title order={2} mb="lg">Rewards Shop</Title>
            <Text mb="lg">Spend your HP!</Text>

            {isLoading && <Loader />}
            {error && ( <Alert icon={<IconAlertCircle size="1rem" />} title="Error Loading Rewards" color="red" mb="md"> {error} </Alert> )}

            {!isLoading && !error && rewards.length > 0 && (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                    {rewards.map((reward) => {
                        const isCurrentRedeeming = isRedeeming === reward.id;
                        // Removed currentMessage state check

                        return (
                            <Card key={reward.id} shadow="sm" padding="lg" radius="md" withBorder>
                                <Group justify="space-between" mt="md" mb="xs"> <Text fw={500}>{reward.name}</Text> <Badge color="yellow" variant="light" leftSection={<IconCoin size={14} />}> {reward.costHp} HP </Badge> </Group>
                                <Text size="sm" c="dimmed" mb="md"> {reward.description} </Text>

                                 {/* Removed inline Alert - using Notifications now */}

                                <Button
                                    variant="light" color="blue" fullWidth mt="md" radius="md"
                                    onClick={() => handleRedeem(reward.id, reward.costHp)}
                                    loading={isCurrentRedeeming}
                                    disabled={isCurrentRedeeming}
                                    leftSection={<IconShoppingCartPlus size={16} />}
                                > Redeem </Button>
                            </Card>
                        );
                    })}
                </SimpleGrid>
            )}
            {!isLoading && !error && rewards.length === 0 && ( <Text>No rewards available.</Text> )}
        </Box>
    );
};

export default RewardsPage;