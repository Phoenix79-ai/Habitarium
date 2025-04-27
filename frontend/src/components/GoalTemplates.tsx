// src/components/GoalTemplates.tsx
import React, { useState } from 'react';
import { Box, Title, Text, Button, Paper, Stack, Group, SimpleGrid, Badge, LoadingOverlay } from '@mantine/core';
import { IconPlus, IconTargetArrow } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import apiClient from '../services/apiClient';

// Interfaces (can be imported from a shared types file later)
interface HabitTemplate {
    name: string;
    description?: string | null;
    frequency: 'daily' | 'weekly' | 'monthly';
}
interface GoalTemplate {
    id: string;
    name: string;
    description: string;
    habits: HabitTemplate[];
}

interface GoalTemplatesProps {
    templates: GoalTemplate[];
    isLoading: boolean;
    onTemplateAdded: () => void; // Callback to refresh dashboard data
}

const GoalTemplates: React.FC<GoalTemplatesProps> = ({ templates, isLoading, onTemplateAdded }) => {
    const [processingTemplateId, setProcessingTemplateId] = useState<string | null>(null);

    const handleAddTemplate = async (template: GoalTemplate) => {
        if (processingTemplateId) return; // Prevent double clicks

        if (!window.confirm(`Add the goal "${template.name}" and its ${template.habits.length} habits to your dashboard?`)) {
            return;
        }

        setProcessingTemplateId(template.id);
        try {
            // Call the backend endpoint to add this template for the user
            await apiClient.post(`/goals/templates/${template.id}/add`);

            notifications.show({
                title: 'Template Added!',
                message: `Goal "${template.name}" and habits added successfully.`,
                color: 'green',
                icon: <IconPlus size={18} />,
            });
            onTemplateAdded(); // Trigger data refresh on dashboard

        } catch (err: any) {
            console.error(`Error adding template ${template.id}:`, err);
            const msg = err.response?.data?.message || "Failed to add goal template";
            notifications.show({
                title: 'Error',
                message: msg,
                color: 'red',
            });
        } finally {
            setProcessingTemplateId(null);
        }
    };

    return (
        <Box>
            <Title order={4} mb="md">Goal Templates (Get Started Fast!)</Title>
            <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
            { !isLoading && templates.length === 0 && (
                <Text c="dimmed" size="sm">No goal templates available.</Text>
            )}
            { !isLoading && templates.length > 0 && (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                    {templates.map((template) => (
                        <Paper key={template.id} shadow="sm" p="lg" radius="md" withBorder pos="relative">
                            <LoadingOverlay visible={processingTemplateId === template.id} overlayProps={{radius: 'sm', blur: 2}} loaderProps={{ type: 'dots' }}/>
                            <Stack gap="sm">
                                <Group justify="space-between" align="flex-start">
                                     <Title order={5}><IconTargetArrow size={18} style={{ marginRight: '5px', verticalAlign: 'middle' }}/> {template.name}</Title>
                                     <Badge variant='light' size='sm'>{template.habits.length} Habits</Badge>
                                </Group>
                                <Text size="sm" c="dimmed" mb="md">{template.description}</Text>
                                <Box>
                                    {/* Optionally list habit names */}
                                    {/* {template.habits.slice(0, 3).map((habit, idx) => (
                                        <Text size="xs" key={idx} truncate>• {habit.name}</Text>
                                    ))}
                                    {template.habits.length > 3 && <Text size="xs">...and more</Text>} */}
                                </Box>
                                <Button
                                    mt="md"
                                    size="xs"
                                    variant="gradient" // Or 'light' or 'filled'
                                    gradient={{ from: 'teal', to: 'lime', deg: 105 }}
                                    leftSection={<IconPlus size={16} />}
                                    onClick={() => handleAddTemplate(template)}
                                    disabled={!!processingTemplateId} // Disable while any template is processing
                                >
                                    Add This Goal
                                </Button>
                            </Stack>
                        </Paper>
                    ))}
                </SimpleGrid>
            )}
        </Box>
    );
};

export default GoalTemplates;