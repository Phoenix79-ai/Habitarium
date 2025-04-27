// src/pages/DashboardPage.tsx (Complete with Goals & Templates - Retrying Full Code)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import AddHabitForm from '../components/AddHabitForm';
import EditHabitForm from '../components/EditHabitForm';
import GoalTemplates from '../components/GoalTemplates'; // <-- Import GoalTemplates component

// Mantine Imports
import {
    Box, Title, Text, Button, Divider, Alert, Paper, Group, ActionIcon,
    Tooltip, Stack, Progress, Badge, Skeleton, ThemeIcon, Modal, TextInput, Accordion,
    ActionIconProps, // For Delete Goal Button type
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks'; // For Modal control
import { notifications } from '@mantine/notifications'; // For feedback

// Icons
import {
    IconLogout, IconPlus, IconPencil, IconTrash, IconPlayerPlay,
    IconCircleCheck, IconAlertCircle, IconAward, IconTargetArrow, // Added IconTargetArrow
    IconChevronDown, IconChevronRight // For Accordion
} from '@tabler/icons-react';

// --- Interfaces ---
// For Custom Goals
interface Goal {
    goal_id: string; // UUID
    name: string;
    created_at: string;
}

// For Habits (linked to Custom Goals)
export interface Habit {
    habit_id: string; // Assuming DB 'id' is returned as 'habit_id'
    user_id: string;  // UUID string
    name: string;
    description: string | null;
    frequency: string;
    created_at: string;
    goal_id: string | null; // <-- Corrected: ID is directly on habit, can be null
    current_streak?: number;
    longest_streak?: number;
    last_logged_date?: string | null;
    is_logged_today?: boolean;
    target?: number;
    // Removed nested 'goal' object
}

// For User Profile
interface UserProfile {
    id: string; // UUID string
    username: string;
    email: string;
    xp: number;
    level: number;
    hp: number;
    created_at: string;
    active_title: string | null;
}

// For Predefined Goal Templates (Data Structure)
interface HabitTemplate {
    name: string;
    description?: string | null;
    frequency: 'daily' | 'weekly' | 'monthly'; // Adjust if backend supports more
}
interface GoalTemplate {
    id: string; // Template's unique identifier (e.g., 'tpl_fitness_starter')
    name: string;
    description: string;
    habits: HabitTemplate[];
}


// --- XP Calculation Helpers ---
const XP_PER_LEVEL_BASE = 100;
const calculateXpThresholdForLevel = (level: number): number => {
    if (level <= 1) return 0;
    return (level - 1) * XP_PER_LEVEL_BASE;
};

// --- Component ---
const DashboardPage: React.FC = () => {
    // --- State ---
    const navigate = useNavigate();
    const [habits, setHabits] = useState<Habit[]>([]); // User's habits
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]); // User's custom goals
    const [goalTemplates, setGoalTemplates] = useState<GoalTemplate[]>([]); // Predefined templates
    const [isLoadingHabits, setIsLoadingHabits] = useState<boolean>(true);
    const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
    const [isLoadingGoals, setIsLoadingGoals] = useState<boolean>(true);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(true); // Loading state for templates
    const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({}); // Tracks habit-specific processing
    const [logMessage, setLogMessage] = useState<{ id: string | null, text: string | null, type: 'success' | 'error' }>({ id: null, text: null, type: 'success' });
    const [error, setError] = useState<string | null>(null); // General page errors
    const [showAddForm, setShowAddForm] = useState<boolean>(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

    // --- Add state for editing goals ---
    const [editGoalModalOpened, { open: openEditGoalModal, close: closeEditGoalModal }] = useDisclosure(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null); // Store the goal being edited
    const [updatedGoalName, setUpdatedGoalName] = useState<string>(''); // Name in the edit modal input
    const [isUpdatingGoal, setIsUpdatingGoal] = useState<boolean>(false); // Loading state for update
    // --- End add state ---

    // Goal Creation Modal State
    const [goalModalOpened, { open: openGoalModal, close: closeGoalModal }] = useDisclosure(false);
    const [newGoalName, setNewGoalName] = useState<string>('');
    const [isCreatingGoal, setIsCreatingGoal] = useState<boolean>(false);

    // --- Add Handlers for Editing Goal ---
    const handleOpenEditGoalModal = (goal: Goal) => {
    setEditingGoal(goal); // Set the goal to edit
    setUpdatedGoalName(goal.name); // Pre-fill input with current name
    setError(null); // Clear errors
    openEditGoalModal(); // Open the specific edit modal
    };

    // --- Utilities ---
    const setProcessingState = (id: string, state: boolean) => { setIsProcessing(prev => ({ ...prev, [id]: state })); };

    // --- Callbacks & Effects ---
    const handleLogout = useCallback(() => {
        console.log("Logout triggered from DashboardPage handler!"); // Add log for verification
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo'); // Make sure this key is correct if you use it
        navigate('/login', { replace: true });
        // Optional: uncomment reload if needed, but navigate should usually suffice
        // window.location.reload();
    }, [navigate]); // Dependency array [navigate] is correct

    const fetchHabits = useCallback(async (showLoading = true) => {
        // Keep existing fetchHabits, ensure it fetches 'goal_id' based on backend update
        if (showLoading) setIsLoadingHabits(true);
        // Assuming backend habit object now includes goal_id: string | null
        try {
            const response = await apiClient.get<{ message: string, habits: Habit[] }>('/habits'); // Expect Habit[] including goal_id
            const habitsArray = response.data?.habits;
            if (Array.isArray(habitsArray)) {
                setHabits(habitsArray);
                // setError(null); // Clear error only if successful
            } else {
                setError(prev => `${prev ? prev + '; ' : ''}Invalid habits data structure`);
                setHabits([]);
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || "Failed to fetch habits";
            setError(prev => `${prev ? prev + '; ' : ''}${msg}`);
            //if (err.response?.status === 401) { handleLogout(); }
        } finally {
            if (showLoading) setIsLoadingHabits(false);
        }
    }, [handleLogout]);

    const fetchUserProfile = useCallback(async () => {
        console.log("[DashboardPage] Attempting fetchUserProfile..."); // Log for debugging
        setIsLoadingProfile(true); // Set loading state
        // No need to clear general error here, let fetchHabits/fetchGoals handle that or append
        try {
            const response = await apiClient.get<{ message: string, user: UserProfile }>('/auth/profile'); // Call the profile endpoint
            if (response.data?.user) {
                setUserProfile(response.data.user); // Set the user profile state on success
            } else {
                // Throw error if structure is invalid
                throw new Error("Invalid profile data structure received");
            }
        } catch (err: any) {
            console.error("Failed to fetch user profile:", err);
            const msg = err.response?.data?.message || "Failed to load profile";
            setError(prev => `${prev ? prev + '; ' : ''}${msg}`); // Append or set error
            setUserProfile(null); // Clear profile on error
            /*if (err.response?.status === 401) {
                handleLogout(); // Logout if unauthorized
            }*/
        } finally {
            setIsLoadingProfile(false); // Clear loading state regardless of success/failure
        }
    }, [handleLogout]); // Dependency array is correct

    // Fetch Goals Function
    const fetchGoals = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoadingGoals(true);
        // setError(null); // Don't clear general error here, append instead if needed
        try {
            const response = await apiClient.get<{ goals: Goal[] }>('/goals');
            if (Array.isArray(response.data?.goals)) {
                setGoals(response.data.goals);
            } else {
                console.error("Invalid goals data structure:", response.data);
                setError(prev => `${prev ? prev + '; ' : ''}Failed to parse goals`);
                setGoals([]);
            }
        } catch (err: any) {
            console.error("Failed to fetch goals:", err);
            const msg = err.response?.data?.message || "Failed to fetch goals";
            setError(prev => `${prev ? prev + '; ' : ''}${msg}`);
            setGoals([]);
            //if (err.response?.status === 401) { handleLogout(); }
        } finally {
            if (showLoading) setIsLoadingGoals(false);
        }
    }, [handleLogout]);

     // Fetch Goal Templates Function
     const fetchGoalTemplates = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoadingTemplates(true);
        try {
            const response = await apiClient.get<{ templates: GoalTemplate[] }>('/goals/templates');
            if (Array.isArray(response.data?.templates)) { setGoalTemplates(response.data.templates); }
            else { setError(prev => `${prev ? prev + '; ' : ''}Failed to parse goal templates`); setGoalTemplates([]); }
        } catch (err: any) {
            console.error("Failed to fetch goal templates:", err);
            const msg = err.response?.data?.message || "Failed to fetch goal templates";
            setError(prev => `${prev ? prev + '; ' : ''}${msg}`); setGoalTemplates([]);
        } finally { if (showLoading) setIsLoadingTemplates(false); }
    }, []); // No dependencies needed

    const handleUpdateGoal = async () => {
      if (!editingGoal) return; // Should not happen if modal is open
      if (!updatedGoalName.trim()) {
           notifications.show({ color: 'red', title: 'Error', message: 'Goal name cannot be empty.' });
           return;
      }
      if (updatedGoalName.trim() === editingGoal.name) {
          // Optional: Close modal without API call if name hasn't changed
          closeEditGoalModal();
          return;
      }
  
      setIsUpdatingGoal(true);
      setError(null);
      try {
           await apiClient.put(`/goals/${editingGoal.goal_id}`, { name: updatedGoalName.trim() });
           notifications.show({
               color: 'green',
               title: 'Success',
               message: `Goal updated to "${updatedGoalName.trim()}"!`,
               icon: <IconCircleCheck size={18} />,
           });
           closeEditGoalModal();
           fetchGoals(false); // Refetch goals to update the list name
      } catch (err: any) {
           const msg = err.response?.data?.message || "Failed to update goal";
           console.error("Goal update error:", err);
           setError(`Goal update failed: ${msg}`); // Display error (maybe inside modal?)
           notifications.show({ color: 'red', title: 'Error', message: msg });
      } finally {
           setIsUpdatingGoal(false);
      }
  };
  // --- End Add Handlers ---


    // Fetch All Data on Mount
    useEffect(() => {
        setError(null); // Clear errors on initial load/refresh
        setIsLoadingHabits(true); // Set loading states before fetching
        setIsLoadingProfile(true);
        setIsLoadingGoals(true);
        setIsLoadingTemplates(true); // Set initial loading state
        // Fetch all concurrently
        Promise.all([
             fetchHabits(true),
             fetchUserProfile(), // Doesn't need showLoading arg based on its definition
             fetchGoals(true),
             fetchGoalTemplates(true) // Fetch templates
        ]).catch(err => {
            // Handle potential promise rejection if needed, although individual fetches handle errors
            console.error("Error during initial data fetch:", err);
        });
    }, [fetchHabits, fetchUserProfile, fetchGoals, fetchGoalTemplates]); // Correct dependencies


    // --- Goal Handlers ---
    const handleOpenCreateGoalModal = () => {
        setNewGoalName(''); // Reset field
        setError(null); // Clear errors specific to modal
        openGoalModal();
    };

    const handleCreateGoal = async () => {
        if (!newGoalName.trim()) {
            notifications.show({ color: 'red', title: 'Error', message: 'Goal name cannot be empty.' });
            return;
        }
        setIsCreatingGoal(true);
        setError(null);
        try {
            await apiClient.post('/goals', { name: newGoalName.trim() });
            notifications.show({
                color: 'green',
                title: 'Success',
                message: `Goal "${newGoalName.trim()}" created successfully!`,
                icon: <IconCircleCheck size={18} />,
            });
            closeGoalModal();
            fetchGoals(false); // Refetch goals without showing main loading indicator
        } catch (err: any) {
            const msg = err.response?.data?.message || "Failed to create goal";
            console.error("Goal creation error:", err);
            setError(`Goal creation failed: ${msg}`); // Set error state to display in modal or page
            notifications.show({ color: 'red', title: 'Error', message: msg });
        } finally {
            setIsCreatingGoal(false);
        }
    };

      const handleDeleteGoal = async (goalId: string, goalName: string) => {
        if (!window.confirm(`Are you sure you want to delete the goal "${goalName}"? Associated habits will become unassigned.`)) {
            return;
        }
        // Set processing state specifically for this goal if needed, though maybe not necessary
        // setProcessingState(goalId, true); // Example if using isProcessing for goals too
        setError(null);
        try {
            await apiClient.delete(`/goals/${goalId}`);
            notifications.show({
                color: 'green',
                title: 'Success',
                message: `Goal "${goalName}" deleted.`,
            });
            fetchGoals(false); // Refetch goals
            // Also refetch habits as their goal_id might have changed to null
            fetchHabits(false);
        } catch (err: any) {
             const msg = err.response?.data?.message || "Failed to delete goal";
             console.error("Goal deletion error:", err);
             setError(`Goal deletion failed: ${msg}`);
             notifications.show({ color: 'red', title: 'Error', message: msg });
        } finally {
             // setProcessingState(goalId, false);
        }
    };


    // --- Other Handlers ---
    const handleHabitAdded = () => { setShowAddForm(false); fetchHabits(false); }; // Keep existing
    const handleCancelAdd = () => { setShowAddForm(false); }; // Keep existing
    const handleDeleteHabit = async (habitId: string) => {
      // Confirm before deleting
      if (!window.confirm("Are you sure you want to delete this habit? This action cannot be undone.")) {
          return;
      }
      setError(null); // Clear general errors
      setLogMessage({ id: null, text: null, type: 'success' }); // Clear specific log messages
      setProcessingState(habitId, true); // Set processing state for this habit

      try {
          await apiClient.delete(`/habits/${habitId}`); // Call the backend API
          notifications.show({ // Show success notification
              color: 'green',
              title: 'Success',
              message: 'Habit deleted successfully.',
              icon: <IconCircleCheck size={18} />,
          });
          fetchHabits(false); // Refresh the habits list to remove the deleted one
      } catch (err: any) {
          const msg = err.response?.data?.message || "Failed to delete habit";
          console.error("Habit deletion error:", err);
          setError(`Habit deletion failed: ${msg}`); // Set general error state
          notifications.show({ color: 'red', title: 'Error', message: msg });
      } finally {
          setProcessingState(habitId, false); // Clear processing state for this habit
      }
    }; // <-- Ensure this final brace and semicolon are here

    const handleLogHabit = async (habitId: string) => {
        // Keep existing logic, but update the habit state more carefully
        setProcessingState(habitId, true);
        setError(null);
        setLogMessage({ id: habitId, text: null, type: 'success' });
        try {
            const response = await apiClient.post<{
                message: string;
                log: any; // Define log type if needed
                habit: { habit_id: string; current_streak: number; longest_streak: number; }; // Backend returns updated habit streak info
                gamification: any; // Define gamification type if needed
                simulatedTxHash: string;
            }>(`/habits/${habitId}/log`);

            const feedback = response.data?.gamification;
            const updatedHabitStreaks = response.data?.habit;
            let successMsg = `Logged!`;
            let profileNeedsRefresh = false;

            if (feedback) {
                successMsg += ` +${feedback.xpEarned} XP, +${feedback.hpEarned} HP.`;
                if (updatedHabitStreaks && updatedHabitStreaks.current_streak > 1) {
                    successMsg += ` Streak: ${updatedHabitStreaks.current_streak} days!`;
                }
                if (feedback.levelUp) {
                    successMsg += ` LEVEL UP to ${feedback.newLevel}!`;
                    profileNeedsRefresh = true; // Refresh profile on level up
                }
            }
            // Update specific habit's state based on backend response
            setHabits(currentHabits => currentHabits.map(h =>
                h.habit_id === habitId
                    ? { ...h,
                        is_logged_today: true, // Mark as logged
                        current_streak: updatedHabitStreaks?.current_streak ?? h.current_streak,
                        longest_streak: updatedHabitStreaks?.longest_streak ?? h.longest_streak
                      }
                    : h
            ));
            setLogMessage({ id: habitId, text: successMsg, type: 'success' });
            setTimeout(() => setLogMessage(prev => prev.id === habitId ? { id: null, text: null, type: 'success' } : prev), 4000);

            // Optionally update profile immediately with gamification results for faster UX
            if (feedback && !profileNeedsRefresh) {
                setUserProfile(prev => prev ? ({
                    ...prev,
                    xp: feedback.currentUserXp ?? prev.xp,
                    hp: feedback.currentUserHp ?? prev.hp,
                    level: feedback.currentUserLevel ?? prev.level,
                 }) : null);
            } else if (profileNeedsRefresh) {
                 fetchUserProfile(); // Full refresh needed on level up
            }

        } catch (err: any) {
            const msg = err.response?.data?.message || "Failed to log habit";
            setLogMessage({ id: habitId, text: msg, type: 'error' });
        } finally {
            setProcessingState(habitId, false);
        }
    };

    const handleShowEditForm = (habit: Habit) => { setEditingHabit(habit); setShowAddForm(false); setError(null); setLogMessage({ id: null, text: null, type: 'success' }); };
    const handleCancelEdit = () => { setEditingHabit(null); };
    const handleHabitUpdated = () => {
        // This might need to refetch goals if goal assignment changes
        setEditingHabit(null);
        fetchHabits(false);
        fetchGoals(false); // Also refetch goals in case name was implicitly changed (though unlikely)
    };

    // --- Calculate Progress Bar Values ---
    const xpForCurrentLevel = userProfile ? calculateXpThresholdForLevel(userProfile.level) : 0;
    const xpForNextLevel = userProfile ? calculateXpThresholdForLevel(userProfile.level + 1) : XP_PER_LEVEL_BASE;
    const xpInCurrentLevel = userProfile ? Math.max(0, userProfile.xp - xpForCurrentLevel) : 0;
    const xpNeededThisLevel = Math.max(1, xpForNextLevel - xpForCurrentLevel);
    const progressPercent = xpNeededThisLevel > 0 ? (xpInCurrentLevel / xpNeededThisLevel) * 100 : 0;

    // --- Group Habits by Goal (Derived State) ---
    const groupedHabits = useMemo(() => {
        const groups: Record<string, Habit[]> = { 'unassigned': [] }; // Start with unassigned
        goals.forEach(goal => {
            groups[goal.goal_id] = []; // Initialize for each fetched custom goal
        });

        habits.forEach(habit => {
            const key = habit.goal_id || 'unassigned';
            // Ensure the group exists before pushing (handles case where goal was deleted after habit fetch)
            if (!groups[key]) {
                 groups[key] = []; // Create group if somehow missing (e.g., race condition)
            }
            groups[key].push(habit);
        });
        return groups;
    }, [habits, goals]);

    // --- Render Habit Card (Helper Component/Function) ---
    const renderHabitCard = (habit: Habit) => {
         const isValidId = typeof habit?.habit_id === 'string' && habit.habit_id.length > 0;
         const isCurrentProcessing = !!isProcessing[habit.habit_id];
         const currentLogMessage = logMessage.id === habit.habit_id ? logMessage : null;

         // Defensive check for habit object
         if (!habit) return null;

         return (
            <Paper key={isValidId ? habit.habit_id : `invalid-habit-${Math.random()}`} withBorder shadow="xs"
                p="lg" radius="md" mb="md"
                style={{
                    borderLeft: habit.is_logged_today ? '5px solid var(--mantine-color-green-6)' : undefined,
                }}>
                <Group justify="space-between" wrap="nowrap">
                    <Box style={{ flexGrow: 1, overflow: 'hidden', marginRight: '1rem' }}>
                        <Title order={5} fw={600} truncate="true">{habit.name || 'Unnamed Habit'}</Title>
                        <Group gap="sm" mt={4}>
                            <Text size="xs" c="dimmed">Freq: {habit.frequency || 'N/A'}</Text>
                            {(habit.current_streak ?? 0) > 0 && ( <Badge color="orange" variant="light" size="xs" leftSection={<span>🔥</span>} > {habit.current_streak}d </Badge> )}
                            {(habit.longest_streak ?? 0) > 0 && ( <Tooltip label={`Longest: ${habit.longest_streak}d`} withArrow><Text size="xs" c="dimmed" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'default' }}> <IconAward size={12} style={{ marginRight: '2px' }} /> {habit.longest_streak} </Text></Tooltip> )}
                        </Group>
                        {habit.description && <Text size="xs" mt="xs" c="dimmed" truncate>{habit.description}</Text>}
                    </Box>
                    {/* Actions */}
                    <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                         {/* Log Button */}
                         <Tooltip label={habit.is_logged_today ? "Already Logged Today" : "Log Habit"} withArrow>
                           <div>
                                <ActionIcon
                                    variant="subtle" color="green" size="lg"
                                    onClick={() => { if (isValidId) { handleLogHabit(habit.habit_id); } }}
                                    disabled={isCurrentProcessing || !isValidId || habit.is_logged_today}
                                    loading={isCurrentProcessing && logMessage.id === habit.habit_id && !logMessage.text}
                                >
                                    {habit.is_logged_today ? <IconCircleCheck size={18} /> : <IconPlayerPlay size={18} />}
                                </ActionIcon>
                           </div>
                        </Tooltip>
                        {/* Edit Button */}
                        <Tooltip label="Edit Habit" withArrow>
                           <div>
                                <ActionIcon variant="subtle" color="gray" size="lg"
                                    onClick={() => { if (isValidId) { handleShowEditForm(habit); } }}
                                    disabled={isCurrentProcessing || !isValidId} >
                                    <IconPencil size={18} />
                                </ActionIcon>
                           </div>
                        </Tooltip>
                        {/* Delete Button */}
                        <Tooltip label="Delete Habit" withArrow>
                           <div>
                                <ActionIcon variant="subtle" color="red" size="lg"
                                    onClick={() => { if (isValidId) { handleDeleteHabit(habit.habit_id); } else { setError("Cannot delete: Missing ID."); } }}
                                    disabled={isCurrentProcessing || !isValidId}
                                    loading={isCurrentProcessing && !logMessage.text && isProcessing[habit.habit_id]} >
                                    <IconTrash size={18} />
                                </ActionIcon>
                            </div>
                        </Tooltip>
                    </Group>
                </Group>
                {/* Log message specific to this habit */}
                {currentLogMessage?.text && (
                   <Alert
                        icon={currentLogMessage.type === 'error' ? <IconAlertCircle size="1rem" /> : <IconCircleCheck size="1rem" />}
                        color={currentLogMessage.type === 'error' ? 'red' : 'green'}
                        radius="sm" mt="md"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9em' }}
                        withCloseButton={currentLogMessage.type === 'error'}
                        onClose={() => setLogMessage({ id: null, text: null, type: 'success' })}
                    >
                        {currentLogMessage.text}
                    </Alert>
                )}
            </Paper>
        );
    };


    // --- JSX Rendering ---
    return (
        <Box>
            {/* --- Header Section (Profile & Logout) --- */}
            <Group justify="space-between" mb="lg">
                <Title order={2}>Dashboard</Title>
                <Box ta="right">
                     {/* Active Title Display */}
                     {!isLoadingProfile && userProfile?.active_title && ( <Text size="sm" c="dimmed" mb={4}> Active Title: <Text span fw={600} c="orange">{userProfile.active_title}</Text> </Text> )}
                     {/* Username Display */}
                     {!isLoadingProfile && userProfile?.username && ( <Text size="sm" fw={500} mb={4}> {userProfile.username} </Text> )}
                     {/* Loading Skeletons */}
                     {isLoadingProfile && ( <Group gap="xs" justify="flex-end"><Skeleton height={24} width={60} /><Skeleton height={24} width={60} /><Skeleton height={24} width={60} /></Group> )}
                     {/* Profile Badges & Progress Bar */}
                     {!isLoadingProfile && userProfile && (
                         <Stack gap={4} align="flex-end">
                             <Group gap="xs">
                                 <Badge color="teal" variant="light" size="lg"> Lvl {userProfile.level} </Badge>
                                 <Badge color="blue" variant="light" size="lg"> {userProfile.xp} XP </Badge>
                                 <Badge color="yellow" variant="light" size="lg"> {userProfile.hp} HP </Badge>
                             </Group>
                             <Tooltip label={`${xpInCurrentLevel} / ${xpNeededThisLevel} XP this level`}>
                                 <Progress value={progressPercent} size="sm" striped animate radius="sm" style={{ width: '200px' }} aria-label="XP Progress" />
                             </Tooltip>
                         </Stack>
                     )}
                     {/* Profile Error Message */}
                     {!isLoadingProfile && !userProfile && !isLoadingHabits && error && ( <Text size="sm" c="red">Profile Error</Text> )}
                 </Box>
                <Button leftSection={<IconLogout size={16} />} variant="outline" color="red" onClick={handleLogout}> Logout </Button>
            </Group>

            {/* Welcome Message */}
            <Text mb="md"> Welcome{userProfile ? `, ${userProfile.username}` : ''}! Ready to achieve your goals?</Text>

            {/* --- General Error Alert --- */}
            {error && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" withCloseButton onClose={() => setError(null)} mb="md" variant='light'>
                    {error.split('; ').map((msg, idx) => <Text key={idx} size="sm">{msg}</Text>)}
                </Alert>
            )}

            {/* --- Add Habit / Add Goal Section --- */}
            <Box mb="xl">
                 {!showAddForm && !editingHabit && (
                    <Group>
                         <Button leftSection={<IconPlus size={16} />} color="green" variant="filled" onClick={() => { setShowAddForm(true); setError(null); setLogMessage({ id: null, text: null, type: 'success' }); }} > Add New Habit </Button>
                         <Button leftSection={<IconTargetArrow size={16} />} variant="outline" onClick={handleOpenCreateGoalModal} > Create New Goal </Button>
                    </Group>
                 )}
                 {showAddForm && (
                    <Paper withBorder shadow="xs" p="md" mt="md">
                         <Title order={4} mb="sm">Add Habit</Title>
                         <AddHabitForm
                            goals={goals}
                            onHabitAdded={handleHabitAdded}
                            onCancel={handleCancelAdd} />
                    </Paper>
                 )}
                 {editingHabit && (
                    <Paper withBorder shadow="xs" p="md" mt="md">
                        <Title order={4} mb="sm">Editing: {editingHabit.name}</Title>
                        <EditHabitForm
                            habitToEdit={editingHabit}
                            goals={goals}
                            onHabitUpdated={handleHabitUpdated}
                            onCancel={handleCancelEdit} />
                     </Paper>
                 )}
            </Box>

            <Divider mb="xl" />

            {/* --- Goal Templates Section --- */}
            <Box mb="xl">
                <GoalTemplates
                    templates={goalTemplates}
                    isLoading={isLoadingTemplates}
                    onTemplateAdded={() => {
                        notifications.show({ message: 'Refreshing your goals and habits...', loading: true, id: 'refresh-data', autoClose: 1000});
                        Promise.all([
                            fetchGoals(false),
                            fetchHabits(false)
                        ]).then(() => {
                             notifications.update({ id: 'refresh-data', message: 'Data refreshed!', color: 'green', loading: false, autoClose: 2000 });
                        }).catch(() => {
                             notifications.update({ id: 'refresh-data', message: 'Failed to refresh data.', color: 'red', loading: false, autoClose: 3000 });
                        });
                    }}
                />
            </Box>
            {/* --- End Goal Templates Section --- */}

            <Divider mb="xl" />

            {/* --- Your Goals & Habits List Section --- */}
            <Title order={3} mb="xl">Your Goals & Habits</Title>

            {/* Combined Loading State for User's Data */}
            {(isLoadingHabits || isLoadingGoals || isLoadingProfile) && ( // Include profile loading here too
                 <Stack>
                    {/* Skeletons for goals/habits list */}
                    <Skeleton height={40} mb="sm" width="30%" />
                    <Skeleton height={80} radius="md" mb="md"/>
                    <Skeleton height={80} radius="md" mb="md"/>
                 </Stack>
            )}

            {/* Display Accordion for User's Goals and Habits */}
            {!isLoadingHabits && !isLoadingGoals && !isLoadingProfile && ( // Only render when ALL user data is loaded
                (habits.length === 0 && goals.length === 0) ? (
                    // Empty State if no custom goals OR habits exist
                    <Paper withBorder p="xl" radius="md" style={{ textAlign: 'center', marginTop: '2rem', backgroundColor: 'var(--mantine-color-dark-6)'}}>
                        <ThemeIcon variant="light" radius="xl" size={80} color="gray" style={{ margin: '0 auto 1rem auto' }}> <IconTargetArrow size={40} /> </ThemeIcon>
                        <Title order={4} mb="xs">No Custom Goals or Habits Yet!</Title>
                        <Text c="dimmed" mb="lg">Use a template above, create a goal, or add your first habit.</Text>
                    </Paper>
                ) : (
                    <Accordion chevronPosition="left" variant="separated" defaultValue="unassigned">
                        {/* Render Custom Goals */}
                        {goals.map(goal => (
                            <Accordion.Item key={goal.goal_id} value={goal.goal_id}>
                                <Accordion.Control icon={<IconTargetArrow size={20} color='orange'/>}>
                                    <Group justify="space-between" wrap="nowrap">
                                        <Text fw={500} truncate style={{ flexGrow: 1 }}>
                                          {goal.name}
                                        </Text>
                                         {/* --- Action Icons Group --- */}
                                        <Group gap="xs" wrap="nowrap"></Group>
                                         {/* Edit Goal Button */}
                                        <Tooltip label="Edit Goal Name" withArrow position="left">
                                            <ActionIcon size="sm" variant="subtle" color="blue"
                                              onClick={(e) => { e.stopPropagation(); handleOpenEditGoalModal(goal); }}>
                                            <IconPencil size={16} />
                                          </ActionIcon>
                                        </Tooltip>
                                        {/* Delete Goal Button */}
                                         <Tooltip label="Delete Goal" withArrow position="left">
                                            <ActionIcon size="sm" variant="subtle" color="red" mr="md"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.goal_id, goal.name); }}>
                                                <IconTrash size={16} />
                                            </ActionIcon>
                                         </Tooltip>
                                    </Group>
                                </Accordion.Control>
                                <Accordion.Panel>
                                    {groupedHabits[goal.goal_id]?.length > 0 ? (
                                        groupedHabits[goal.goal_id].map(renderHabitCard)
                                    ) : (
                                        <Text size="sm" c="dimmed" p="md">No habits assigned to this goal yet.</Text>
                                    )}
                                </Accordion.Panel>
                            </Accordion.Item>
                        ))}

                         {/* Render Unassigned Habits */}
                         {(groupedHabits['unassigned']?.length > 0) && ( // Only show if there ARE unassigned habits
                             <Accordion.Item value="unassigned">
                                <Accordion.Control icon={<IconCircleCheck size={20} color='gray'/>}>
                                    <Text fw={500}>Unassigned Habits</Text>
                                </Accordion.Control>
                                <Accordion.Panel>
                                     {groupedHabits['unassigned'].map(renderHabitCard)}
                                </Accordion.Panel>
                            </Accordion.Item>
                         )}
                    </Accordion>
                )
            )}


                          {/* --- Create Goal Modal --- */}
                          <Modal opened={goalModalOpened} onClose={closeGoalModal} title="Create New Goal" centered>
                 <Stack>
                     <TextInput
                         label="Goal Name"
                         placeholder="e.g., Improve Fitness, Learn Piano"
                         value={newGoalName}
                         onChange={(event) => setNewGoalName(event.currentTarget.value)}
                         data-autofocus // Focus input when modal opens
                         required
                     />
                      {/* Optional: Display create-specific errors here if needed, currently using general error */}
                     <Button onClick={handleCreateGoal} loading={isCreatingGoal}>
                         Create Goal
                     </Button>
                 </Stack>
             </Modal>
             {/* --- End Create Goal Modal --- */}


             {/* --- Edit Goal Modal --- */}
             <Modal
                 opened={editGoalModalOpened}
                 onClose={closeEditGoalModal}
                 title={`Edit Goal: ${editingGoal?.name || ''}`} // Show original name in title
                 centered
             >
                 {editingGoal && ( // Render form content only if a goal is being edited
                     <Stack>
                         {/* Optional: Add Alert here for edit-specific feedback if you implement goalEditMessage state */}
                         {/* {goalEditMessage && ( <Alert ... > {goalEditMessage.text} </Alert> )} */}

                         <TextInput
                             label="New Goal Name"
                             placeholder="Enter the updated goal name"
                             value={updatedGoalName} // Controlled by updatedGoalName state
                             onChange={(event) => setUpdatedGoalName(event.currentTarget.value)}
                             data-autofocus // Focus input when modal opens
                             required
                             onKeyDown={(event) => { // Optional: Submit on Enter key
                                 if (event.key === 'Enter') {
                                     handleUpdateGoal();
                                 }
                             }}
                         />
                         <Button onClick={handleUpdateGoal} loading={isUpdatingGoal} color="blue">
                             Save Changes
                         </Button>
                     </Stack>
                 )}
             </Modal>
             {/* --- End Edit Goal Modal --- */}


        </Box> // This should be the closing tag of the main return statement's Box
    ); // This should be the closing parenthesis of the main return statement
}; // This should be the closing brace of the DashboardPage component function

export default DashboardPage; // Export statement should follow