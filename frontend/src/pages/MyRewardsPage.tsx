// src/pages/MyRewardsPage.tsx (Corrected with implemented handleSetActiveTitle)

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
// --- Mantine Imports ---
import { Box, Title, Text, Loader, Alert, SimpleGrid, Card, Button, Badge, Group } from '@mantine/core'; // Ensure Button is imported
import { notifications } from '@mantine/notifications'; // Import notifications
// --- Icons ---
import { IconAlertCircle, IconAward, IconCircleCheck, IconCoin } from '@tabler/icons-react';

// Interfaces
interface Reward { id: string; name: string; description: string; costHp: number; }
interface OwnedRewardsResponse { message: string; ownedRewards: Reward[]; }
interface UserProfileBrief { active_title: string | null; } // For profile fetch
interface UpdateTitleResponse { message: string; user?: { active_title: string | null }; } // For update response

const MyRewardsPage: React.FC = () => {
    const [ownedRewards, setOwnedRewards] = useState<Reward[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTitle, setActiveTitle] = useState<string | null>(null);
    // --- Add state to track which title button is loading ---
    const [isSettingTitle, setIsSettingTitle] = useState<string | null>(null);

    // Fetch User Profile (to get active title)
    const fetchUserProfile = useCallback(async () => {
       console.log("[MyRewardsPage] Fetching user profile for active title...");
       try {
           const response = await apiClient.get<{ message: string, user: UserProfileBrief }>('/auth/profile');
           if (response.data?.user) { setActiveTitle(response.data.user.active_title); }
       } catch (err) { console.error("[MyRewardsPage] Failed to fetch profile:", err); }
    }, []);

    // Fetch OWNED Rewards
    const fetchOwnedRewards = useCallback(async () => {
        setIsLoading(true); setError(null);
        console.log("[MyRewardsPage] Fetching owned rewards...");
        try {
            const response = await apiClient.get<OwnedRewardsResponse>('/rewards/owned');
            if (response.data?.ownedRewards && Array.isArray(response.data.ownedRewards)) {
                setOwnedRewards(response.data.ownedRewards);
            } else { setError("Could not load owned rewards."); setOwnedRewards([]); }
        } catch (err: any) { const msg = err.response?.data?.message || "Fetch error"; setError(msg); }
        finally { setIsLoading(false); }
    }, []);

    // Fetch data on mount
    useEffect(() => { fetchOwnedRewards(); fetchUserProfile(); }, [fetchOwnedRewards, fetchUserProfile]);

    // --- Implemented handleSetActiveTitle ---
    const handleSetActiveTitle = async (rewardName: string) => {
         setIsSettingTitle(rewardName); // Set loading state for this button
         setError(null); // Clear general page errors
         console.log(`[MyRewardsPage] Attempting to set active title to: ${rewardName}`);

         try {
            // Call the backend endpoint: PUT /api/auth/profile/title
            const response = await apiClient.put<UpdateTitleResponse>('/auth/profile/title', { title: rewardName });

            // Check if backend confirms success and provides updated title
            if (response.data?.user?.active_title !== undefined) {
                // Update local state immediately
                setActiveTitle(response.data.user.active_title);
                console.log("[MyRewardsPage] Active title state updated locally to:", response.data.user.active_title);
                // Show success notification
                notifications.show({
                    title: 'Title Updated!',
                    message: `${rewardName} is now your active title.`,
                    color: 'teal',
                    icon: <IconCircleCheck size={18} />,
                    autoClose: 3000,
                });
                 // TODO: Consider notifying Dashboard/Header to update profile display there as well
            } else {
                // Handle unexpected backend response
                throw new Error(response.data?.message || "Invalid response from server");
            }

         } catch (err: any) {
             console.error(`[MyRewardsPage] Error setting active title to ${rewardName}:`, err);
             const msg = err.response?.data?.message || err.message || "Failed to set title";
             // Show error notification
             notifications.show({
                title: 'Update Failed',
                message: msg,
                color: 'red',
                icon: <IconAlertCircle size={18} />,
             });
             // Optionally set page error state
             // setError(msg);
         } finally {
              setIsSettingTitle(null); // Clear loading state for this button
         }
    };

    // --- Render Logic ---
    return (
        <Box>
            <Title order={2} mb="lg">My Unlocked Rewards</Title>
            <Text mb="lg">Set your active title!</Text>

            {isLoading && <Loader />}
            {error && ( <Alert icon={<IconAlertCircle size="1rem" />} title="Error Loading Your Rewards" color="red" mb="md"> {error} </Alert> )}

            {!isLoading && !error && ownedRewards.length > 0 && (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                    {ownedRewards.map((reward) => {
                        const isActive = activeTitle === reward.name;
                        // Check if THIS specific title button is processing
                        const isCurrentSetting = isSettingTitle === reward.name;
                        return (
                            <Card key={reward.id} shadow="sm" padding="lg" radius="md" withBorder>
                                 <Group justify="space-between" mt="xs" mb="xs">
                                    <Text fw={600} size="lg">{reward.name}</Text>
                                    {isActive && ( <Badge color="green" variant="filled" size="sm"> Active Title </Badge> )}
                                 </Group>
                                <Text size="sm" c="dimmed" mb="md"> {reward.description} </Text>
                                 {!isActive && reward.id.startsWith('title_') && (
                                    <Button // Button should be imported now
                                        variant="outline"
                                        color="blue"
                                        fullWidth mt="md" radius="md"
                                        onClick={() => handleSetActiveTitle(reward.name)}
                                        leftSection={<IconAward size={16} />}
                                        disabled={isCurrentSetting} // Disable only this button while processing
                                        loading={isCurrentSetting} // Show loading state on this button
                                    >
                                        {isCurrentSetting ? 'Setting...' : 'Set as Active Title'}
                                    </Button>
                                 )}
                            </Card>
                        );
                    })}
                </SimpleGrid>
            )}
            {!isLoading && !error && ownedRewards.length === 0 && ( <Text>You haven't unlocked any rewards yet.</Text> )}
        </Box>
    );
};

export default MyRewardsPage;