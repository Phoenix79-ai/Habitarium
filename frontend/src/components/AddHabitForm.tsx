// src/components/AddHabitForm.tsx (With Goal Assignment)

import React, { useState, useMemo } from 'react';
import apiClient from '../services/apiClient';
// --- Mantine Imports ---
import { TextInput, Textarea, Select, Button, Box, Alert, Group } from '@mantine/core'; // Added Textarea, Select if needed
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';

// --- Interfaces ---
// Assuming Goal interface might be defined elsewhere (e.g., DashboardPage or types file)
// If not, define it here:
interface Goal {
    goal_id: string;
    name: string;
    created_at: string;
}

// Props interface - updated to accept goals
interface AddHabitFormProps {
  goals: Goal[]; // Accept the array of goals
  onHabitAdded: () => void;
  onCancel: () => void;
}

// --- Component ---
const AddHabitForm: React.FC<AddHabitFormProps> = ({ goals, onHabitAdded, onCancel }) => {
  // --- State ---
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [frequency, setFrequency] = useState<string>('daily');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null); // State for selected goal
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // --- Memoized Goal Options for Select ---
  const goalOptions = useMemo(() => {
      // Start with a 'None' option
      const options = [{ value: '', label: '-- None --' }];
      // Add options for each goal fetched from props
      goals.forEach(goal => {
          options.push({ value: goal.goal_id, label: goal.name });
      });
      return options;
  }, [goals]); // Recalculate only when goals array changes


  // --- Submit Handler ---
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null); // Clear local form error first
    if (!name || !frequency) {
      setError("Name and frequency required."); // Set local form error if validation fails
      return;
    }

    setIsSubmitting(true);
    try {
      // Include goal_id in the payload
      // We don't strictly need the response data here unless we want the new habit ID immediately
      await apiClient.post('/habits', {
        name: name.trim(),
        description: description.trim() === '' ? null : description.trim(),
        frequency,
        goal_id: selectedGoalId || null, // Send selectedGoalId or null if 'None' was chosen
      });

      // --- Add Notification Here ---
      notifications.show({
          title: 'Success!',
          message: `Habit "${name.trim()}" added successfully.`, // Use name from state before reset
          color: 'green',
          icon: <IconCircleCheck size={18} />, // Ensure IconCircleCheck is imported
      });
      // --- End Notification ---

      // Reset form state AFTER showing notification but BEFORE calling parent callback
      const habitNameForNotification = name.trim(); // Capture name before resetting
      setName('');
      setDescription('');
      setFrequency('daily');
      setSelectedGoalId(null); // Reset goal selection
      setError(null); // Clear any previous local errors

      // Call parent callback AFTER resetting form and showing notification
      onHabitAdded();

    } catch (err: any) {
      // Set local form error state on failure
      const errorMsg = err.response?.data?.message || err.message || "Failed to create habit";
      setError(errorMsg);
      // Optionally show a notification for the error too
      // notifications.show({ title: 'Error', message: errorMsg, color: 'red' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- JSX ---
  return (
    <form onSubmit={handleSubmit}>
      {/* Error Alert */}
      {error && (
         <Alert icon={<IconAlertCircle size="1rem" />} title="Error Creating Habit" color="red" withCloseButton onClose={() => setError(null)} mb="md">
           {error}
         </Alert>
       )}

      {/* Name Input */}
      <TextInput
        label="Habit Name"
        placeholder="e.g., Drink Water, Read Book"
        required
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
        mb="sm"
        disabled={isSubmitting}
      />

      {/* Description Input (Using Textarea for potentially longer descriptions) */}
      <Textarea // Changed to Textarea
        label="Description (Optional)"
        placeholder="Any notes or details"
        value={description}
        onChange={(event) => setDescription(event.currentTarget.value)}
        mb="sm"
        autosize // Allows textarea to grow
        minRows={2}
        disabled={isSubmitting}
      />

      {/* Frequency Select */}
      <Select
        label="Frequency"
        required
        value={frequency}
        onChange={(value) => setFrequency(value || 'daily')}
        data={[
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
          // Add other frequencies if needed
        ]}
        mb="sm" // Reduced bottom margin slightly
        disabled={isSubmitting}
      />

      {/* --- Goal Select --- */}
      <Select
        label="Assign to Goal (Optional)"
        placeholder="-- Select a Goal --"
        value={selectedGoalId} // Controlled by state
        onChange={setSelectedGoalId} // Directly set the state (value is goal_id or '')
        data={goalOptions} // Use the memoized options
        mb="md"
        searchable // Allow searching if many goals
        clearable // Allow user to easily select 'None' by clearing
        disabled={isSubmitting || goals.length === 0} // Disable if submitting or no goals exist
      />
      {/* --- End Goal Select --- */}


      {/* Buttons using Mantine Group */}
      <Group justify="flex-end" mt="md">
         <Button variant="default" onClick={onCancel} disabled={isSubmitting}>
           Cancel
         </Button>
         <Button type="submit" loading={isSubmitting}>
           Add Habit
         </Button>
      </Group>
    </form>
  );
};

export default AddHabitForm;