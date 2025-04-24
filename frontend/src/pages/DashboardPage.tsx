// src/pages/DashboardPage.tsx (Complete with UI Polish Enhancements)

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import AddHabitForm from '../components/AddHabitForm';
import EditHabitForm from '../components/EditHabitForm';

// Mantine Imports (Ensure all used components are here)
import {
    Box, Title, Text, Button, Divider, Alert, Paper, Group, ActionIcon,
    Tooltip, Stack, Progress, Badge, Skeleton, ThemeIcon // Added ThemeIcon
} from '@mantine/core';
// Icons (Ensure all used icons are here)
import {
  IconLogout, IconPlus, IconPencil, IconTrash, IconPlayerPlay,
  IconCircleCheck, IconAlertCircle, IconAward // IconAward for longest streak
} from '@tabler/icons-react';

// Habit Interface (with optional streak fields)
export interface Habit {
  habit_id: string;
  user_id: number;
  name: string;
  description: string | null;
  frequency: string;
  created_at: string;
  current_streak?: number;
  longest_streak?: number; // <-- Needs to be fetched
  last_logged_date?: string | null;
  is_logged_today?: boolean; // <-- Add this field (optional '?' for safety)

}

// User Profile Interface (with gamification fields + active_title)
interface UserProfile {
    id: string;
    username: string;
    email: string;
    xp: number;
    level: number;
    hp: number;
    created_at: string;
    active_title: string | null; // <-- Expect active_title
}

// --- XP Calculation Helpers ---
const XP_PER_LEVEL_BASE = 100;
// Calculates the TOTAL XP needed to REACH a specific level
const calculateXpThresholdForLevel = (level: number): number => {
    if (level <= 1) return 0;
    return (level - 1) * XP_PER_LEVEL_BASE;
};

const DashboardPage: React.FC = () => {
  // --- State ---
  const navigate = useNavigate();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingHabits, setIsLoadingHabits] = useState<boolean>(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [logMessage, setLogMessage] = useState<{ id: string | null, text: string | null, type: 'success' | 'error' }>({ id: null, text: null, type: 'success' });
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Utility to set processing state
  const setProcessingState = (id: string, state: boolean) => { setIsProcessing(prev => ({ ...prev, [id]: state })); };

  // --- Callbacks & Effects ---
  const handleLogout = useCallback(() => { localStorage.removeItem('authToken'); localStorage.removeItem('userInfo'); navigate('/login', { replace: true }); window.location.reload(); }, [navigate]);

  // Fetch Habits (Ensure backend sends streaks)
  const fetchHabits = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoadingHabits(true);
    try {
      const response = await apiClient.get<{ message: string, habits: Habit[] } | any>('/habits');
      const habitsArray = response.data?.habits;
      if (Array.isArray(habitsArray)) { setHabits(habitsArray); setError(null); }
      else { setError("Invalid habits data structure"); setHabits([]); }
    } catch (err: any) { const msg = err.response?.data?.message || "Failed to fetch habits"; setError(msg); if (err.response?.status === 401) { handleLogout(); } }
    finally { if (showLoading) setIsLoadingHabits(false); }
  }, [handleLogout]);

  // Fetch User Profile (Ensure backend sends active_title)
  const fetchUserProfile = useCallback(async () => {
      setIsLoadingProfile(true);
      try {
          const response = await apiClient.get<{ message: string, user: UserProfile }>('/auth/profile');
          if (response.data?.user) { setUserProfile(response.data.user); }
          else { throw new Error("Invalid profile data structure"); }
      } catch (err: any) { setError(prev => prev || "Failed to load profile"); if (err.response?.status === 401) { handleLogout(); } }
      finally { setIsLoadingProfile(false); }
  }, [handleLogout]);

  // Fetch Data on Mount
  useEffect(() => { fetchHabits(true); fetchUserProfile(); }, [fetchHabits, fetchUserProfile]);

  // Other Handlers (Add, CancelAdd, Delete, Log, ShowEdit, CancelEdit, Updated)
  const handleHabitAdded = () => { setShowAddForm(false); fetchHabits(false); };
  const handleCancelAdd = () => { setShowAddForm(false); };
  const handleDeleteHabit = async (habitId: string) => {
    if (!window.confirm("Are you sure?")) { return; }
    setError(null); setLogMessage({ id: null, text: null, type: 'success' }); setProcessingState(habitId, true);
    try { await apiClient.delete(`/habits/${habitId}`); fetchHabits(false); }
    catch (err: any) { const msg = err.response?.data?.message || "Failed to delete"; setError(msg); }
    finally { setProcessingState(habitId, false); }
  };
  const handleLogHabit = async (habitId: string) => {
    setProcessingState(habitId, true); setError(null); setLogMessage({ id: habitId, text: null, type: 'success' });
    try {
      const response = await apiClient.post(`/habits/${habitId}/log`);
      const feedback = response.data?.gamification;
      let successMsg = `Logged!`; let profileNeedsRefresh = false;
      if (feedback) {
          successMsg += ` +${feedback.xpEarned} XP, +${feedback.hpEarned} HP.`;
          if (feedback.currentStreak > 1) { successMsg += ` Streak: ${feedback.currentStreak} days!`; }
          if (feedback.levelUp) { successMsg += ` LEVEL UP to ${feedback.newLevel}!`; profileNeedsRefresh = true; }
          setHabits(currentHabits => currentHabits.map(h => h.habit_id === habitId ? { ...h, current_streak: feedback.currentStreak, longest_streak: feedback.longestStreak } : h ));
      }
      setLogMessage({ id: habitId, text: successMsg, type: 'success' });
      setTimeout(() => setLogMessage(prev => prev.id === habitId ? { id: null, text: null, type: 'success' } : prev), 4000);
      if (profileNeedsRefresh) { fetchUserProfile(); }
    } catch (err: any) { const msg = err.response?.data?.message || "Failed to log"; setLogMessage({ id: habitId, text: msg, type: 'error' }); }
    finally { setProcessingState(habitId, false); }
  };
  const handleShowEditForm = (habit: Habit) => { setEditingHabit(habit); setShowAddForm(false); setError(null); setLogMessage({ id: null, text: null, type: 'success' }); };
  const handleCancelEdit = () => { setEditingHabit(null); };
  const handleHabitUpdated = () => { setEditingHabit(null); fetchHabits(false); };

  // --- Calculate Progress Bar Values ---
  const xpForCurrentLevel = userProfile ? calculateXpThresholdForLevel(userProfile.level) : 0;
  const xpForNextLevel = userProfile ? calculateXpThresholdForLevel(userProfile.level + 1) : XP_PER_LEVEL_BASE;
  const xpInCurrentLevel = userProfile ? Math.max(0, userProfile.xp - xpForCurrentLevel) : 0; // Ensure not negative
  const xpNeededThisLevel = Math.max(1, xpForNextLevel - xpForCurrentLevel); // Avoid division by zero
  const progressPercent = (xpInCurrentLevel / xpNeededThisLevel) * 100;

  // --- JSX Rendering ---
  return (
    <Box>
      {/* Header Section */}
      <Group justify="space-between" mb="lg">
        <Title order={2}>Dashboard</Title>
        {/* User Profile Display Area */}
        <Box ta="right">
            {/* Active Title Display */}
            {!isLoadingProfile && userProfile?.active_title && (
                <Text size="sm" c="dimmed" mb={userProfile?.level !== undefined ? 4 : 0}>
                    Active Title: <Text span fw={600} c="orange">{userProfile.active_title}</Text>
                </Text>
            )}
             {/* Username Display */}
             {!isLoadingProfile && userProfile?.username && (
                 <Text size="sm" fw={500} mb={4}> {userProfile.username} </Text>
             )}
            {/* Loading Skeletons */}
            {isLoadingProfile && ( <Group gap="xs" justify="flex-end"> <Skeleton height={24} width={60} /><Skeleton height={24} width={60} /><Skeleton height={24} width={60} /></Group> )}
            {/* Profile Badges & Progress Bar */}
            {!isLoadingProfile && userProfile && (
                <Stack gap={4} align="flex-end">
                    <Group gap="xs">
                        <Badge color="teal" variant="light" size="lg"> Lvl {userProfile.level} </Badge>
                        <Badge color="blue" variant="light" size="lg"> {userProfile.xp} XP </Badge>
                        <Badge color="yellow" variant="light" size="lg"> {userProfile.hp} HP </Badge>
                    </Group>
                    <Tooltip label={`${xpInCurrentLevel} / ${xpNeededThisLevel} XP progress this level`}>
                        <Progress value={progressPercent} size="sm" striped animate radius="sm" style={{ width: '200px' }} aria-label="XP Progress" />
                    </Tooltip>
                </Stack>
            )}
            {/* Profile Error Message */}
            {!isLoadingProfile && !userProfile && error && ( <Text size="sm" c="red">Profile Error</Text> )}
        </Box>
        <Button leftSection={<IconLogout size={16} />} variant="outline" color="red" onClick={handleLogout}> Logout </Button>
      </Group>

      {/* Welcome Message */}
      <Text mb="md"> Welcome{userProfile ? `, ${userProfile.username}` : ''}! Keep building those habits. </Text>

      {/* Add/Edit Section */}
      <Box mb="xl">
        {!showAddForm && !editingHabit && ( <Button leftSection={<IconPlus size={16} />} color="green" variant="filled" onClick={() => { setShowAddForm(true); setError(null); setLogMessage({ id: null, text: null, type: 'success' }); }} > Add New Habit </Button> )}
        {showAddForm && ( <Paper withBorder shadow="xs" p="md" mt="md"> <Title order={4} mb="sm">Add Habit</Title> <AddHabitForm onHabitAdded={handleHabitAdded} onCancel={handleCancelAdd} /> </Paper> )}
        {editingHabit && ( <Paper withBorder shadow="xs" p="md" mt="md"> <Title order={4} mb="sm">Editing: {editingHabit.name}</Title> <EditHabitForm habitToEdit={editingHabit} onHabitUpdated={handleHabitUpdated} onCancel={handleCancelEdit} /> </Paper> )}
      </Box>

      <Divider mb="xl" />

      {/* Habit List Section */}
      <Title order={3} mb="xl">Your Habits</Title>
      {/* General Error Alert */}
      {error && !logMessage.text && ( <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" withCloseButton onClose={() => setError(null)} mb="md"> {error} </Alert> )}
      {/* Loading State for Habits */}
      {isLoadingHabits && <Text>Loading habits...</Text>}

      {/* Habit List */}
      {!isLoadingHabits && (
        habits.length > 0 ? (
          <Stack gap="lg"> {/* Increased gap */}
            {habits.map((habit) => {
              const isValidId = typeof habit?.habit_id === 'string' && habit.habit_id.length > 0;
              const isCurrentProcessing = !!isProcessing[habit.habit_id];
              const isCurrentEditing = editingHabit?.habit_id === habit.habit_id;
              const currentLogMessage = logMessage.id === habit.habit_id ? logMessage : null;
              if (isCurrentEditing) return null;

              return (
                <Paper key={isValidId ? habit.habit_id : `invalid-habit-${Math.random()}`} withBorder shadow="xs"
                 p="lg" 
                 radius="md"
                 style={{
                  borderLeft: habit.is_logged_today ? '5px solid var(--mantine-color-green-6)' : undefined, // Green left border if logged
                  // Optional: Slightly adjust background too?
                  // backgroundColor: habit.is_logged_today ? 'var(--mantine-color-dark-5)' : undefined,
              }}>
                  <Group justify="space-between" wrap="wrap"> {/* Allow wrapping */}
                     <Box style={{ flexGrow: 1, overflow: 'hidden', marginRight: '1rem', marginBottom: '0.5rem' }}>
                        <Title order={4} fw={600} truncate="true">{habit.name || 'Unnamed Habit'}</Title> {/* Larger title */}
                        <Group gap="sm" mt={4}>
                             <Text size="sm" c="dimmed">Freq: {habit.frequency || 'N/A'}</Text>
                             {(habit.current_streak ?? 0) > 0 && ( <Badge color="orange" variant="outline" size="sm" leftSection={<span>🔥</span>} > {habit.current_streak} Day Streak </Badge> )}
                             {(habit.longest_streak ?? 0) > 0 && ( <Tooltip label={`Longest Streak: ${habit.longest_streak} days`} withArrow><Text size="xs" c="dimmed" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'default' }}> <IconAward size={14} style={{ marginRight: '3px' }} /> {habit.longest_streak} </Text></Tooltip> )}
                         </Group>
                         {habit.description && <Text size="sm" mt="xs" c="dimmed">{habit.description}</Text>}
                     </Box>
                     <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}> {/* Prevent shrinking */}
                        <Tooltip label="Log Habit" withArrow><div><ActionIcon variant="subtle" color="green" size="lg" onClick={() => { if (isValidId) { handleLogHabit(habit.habit_id); } }} disabled={isCurrentProcessing || !isValidId} loading={isCurrentProcessing && logMessage.id === habit.habit_id && !logMessage.text} > <IconPlayerPlay size={18} /> </ActionIcon></div></Tooltip>
                        <Tooltip label="Edit Habit" withArrow><div><ActionIcon variant="subtle" color="gray" size="lg" onClick={() => { if (isValidId) { handleShowEditForm(habit); } }} disabled={isCurrentProcessing || !isValidId} > <IconPencil size={18} /> </ActionIcon></div></Tooltip>
                        <Tooltip label="Delete Habit" withArrow><div><ActionIcon variant="subtle" color="red" size="lg" onClick={() => { if (isValidId) { handleDeleteHabit(habit.habit_id); } else { setError("Cannot delete: Missing ID."); } }} disabled={isCurrentProcessing || !isValidId} loading={isCurrentProcessing && !logMessage.text && isProcessing[habit.habit_id]} > <IconTrash size={18} /> </ActionIcon></div></Tooltip>
                     </Group>
                  </Group>
                  {currentLogMessage?.text && ( <Alert icon={currentLogMessage.type === 'error' ? <IconAlertCircle size="1rem" /> : <IconCircleCheck size="1rem" />} color={currentLogMessage.type === 'error' ? 'red' : 'green'} radius="sm" mt="md" style={{ padding: '0.5rem 1rem', fontSize: '0.9em' }} withCloseButton={currentLogMessage.type === 'error'} onClose={() => setLogMessage({ id: null, text: null, type: 'success' })} > {currentLogMessage.text} </Alert> )}
                 </Paper>
              );
            })}
          </Stack>
        ) : (
           // --- Enhanced Empty State ---
           !error && (
             <Paper withBorder p="xl" radius="md" style={{ textAlign: 'center', marginTop: '2rem', backgroundColor: 'var(--mantine-color-dark-6)'}}> {/* Use theme color */}
                 <ThemeIcon variant="light" radius="xl" size={80} color="gray" style={{ margin: '0 auto 1rem auto' }}>
                     <IconPlus size={40} />
                 </ThemeIcon>
                 <Title order={4} mb="xs">No Habits Yet!</Title>
                 <Text c="dimmed" mb="lg">Ready to build some great habits? Get started now.</Text>
                 {!showAddForm && !editingHabit && (
                      <Button leftSection={<IconPlus size={16} />} color="green" variant="filled" onClick={() => { setShowAddForm(true); setError(null); setLogMessage({ id: null, text: null, type: 'success' }); }} > Add Your First Habit </Button>
                 )}
              </Paper>
            )
            // --- End Enhanced Empty State ---
        )
      )}
    </Box>
  );
};

export default DashboardPage;