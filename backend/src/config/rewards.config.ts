// backend/src/config/rewards.config.ts
export interface Reward {
    id: string;
    name: string;
    description: string;
    costHp: number;
}

// Define available rewards statically
export const AVAILABLE_REWARDS: Reward[] = [
    { id: 'title_early_riser', name: 'Early Riser', description: 'Awarded for consistent morning activity.', costHp: 50 },
    { id: 'title_streak_master', name: 'Streak Master', description: 'Prove your dedication!', costHp: 150 },
    { id: 'title_focused_mind', name: 'Focused Mind', description: 'For those who stick to their goals.', costHp: 100 },
    // Add more rewards later
];

// Helper function to find a reward by ID
export const findRewardById = (id: string): Reward | undefined => {
    return AVAILABLE_REWARDS.find(r => r.id === id);
};