// backend/src/config/goalTemplates.config.ts
export interface HabitTemplate {
    name: string;
    description?: string | null;
    frequency: 'daily' | 'weekly' | 'monthly'; // Or allow other strings
}

export interface GoalTemplate {
    id: string; // Simple ID for the template
    name: string;
    description: string;
    habits: HabitTemplate[];
}

export const goalTemplates: GoalTemplate[] = [
    {
        id: 'tpl_fitness_starter',
        name: 'Fitness Starter Pack',
        description: 'Begin your fitness journey with these core habits.',
        habits: [
            { name: 'Walk 5000 steps', frequency: 'daily' },
            { name: 'Drink 8 glasses of water', frequency: 'daily' },
            { name: 'Do 10 push-ups', description: 'Or knee push-ups', frequency: 'daily' },
            { name: 'Stretch for 10 minutes', frequency: 'daily' },
        ]
    },
    {
        id: 'tpl_mindfulness_basics',
        name: 'Mindfulness Basics',
        description: 'Cultivate calm and focus with simple practices.',
        habits: [
            { name: 'Meditate for 5 minutes', frequency: 'daily' },
            { name: 'Practice deep breathing', description: '3 sets of 5 deep breaths', frequency: 'daily'},
            { name: 'Journal one positive thing', frequency: 'daily' },
        ]
    },
    {
        id: 'tpl_learning_boost',
        name: 'Learning Boost',
        description: 'Habits to support acquiring new knowledge or skills.',
        habits: [
            { name: 'Read for 20 minutes', frequency: 'daily' },
            { name: 'Review notes from previous day', frequency: 'daily' },
            { name: 'Plan next day\'s learning session', frequency: 'weekly' },
        ]
    },
    // Add more templates as desired
];