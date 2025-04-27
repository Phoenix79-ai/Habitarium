// src/components/EditHabitForm.tsx (With Goal Assignment)

import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../services/apiClient';
import { Habit } from '../pages/DashboardPage'; // Import the Habit type

// --- Mantine Imports ---
import { TextInput, Textarea, Select, Button, Alert, Group } from '@mantine/core'; // Added Textarea, Select
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
interface EditHabitFormProps {
  habitToEdit: Habit;
  goals: Goal[]; // Accept the array of goals
  onHabitUpdated: () => void; // Callback function on successful update
  onCancel: () => void;     // Callback function to cancel editing
}

// --- Component ---
const EditHabitForm: React.FC<EditHabitFormProps> = ({ habitToEdit, goals, onHabitUpdated, onCancel }) => {
  // --- State ---
  const [name, setName] = useState<string>(habitToEdit.name);
  const [description, setDescription] = useState<string>(habitToEdit.description || '');
  const [frequency, setFrequency] = useState<string>(habitToEdit.frequency);
  // State for selected goal - initialize with the habit's current goal_id
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(habitToEdit.goal_id || null);
  const [message, setMessage] = useState<{ text: string | null, type: 'success' | 'error' }>({ text: null, type: 'success' });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // --- Effect to update form if the selected habit changes ---
  useEffect(() => {
    setName(habitToEdit.name);
    setDescription(habitToEdit.description || '');
    setFrequency(habitToEdit.frequency);
    setSelectedGoalId(habitToEdit.goal_id || null); // Reset goal selection based on new habit
    setMessage({ text: null, type: 'success'}); // Clear message
    setIsSubmitting(false); // Reset submitting state
  }, [habitToEdit]); // Re-run effect if habitToEdit object changes

  // --- Memoized Goal Options for Select ---
  const goalOptions = useMemo(() => {
      const options = [{ value: '', label: '-- None --' }]; // Represents setting goal_id to null
      goals.forEach(goal => {
          options.push({ value: goal.goal_id, label: goal.name });
      });
      return options;
  }, [goals]); // Update only when goals list changes

  // --- Submit Handler ---
  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage({ text: null, type: 'success'}); // Clear previous message
    if (!name || !frequency) {
      setMessage({ text: "Habit name and frequency are required.", type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare updated data, including goal_id
      const updatedData = {
        name: name.trim(),
        description: description.trim() === '' ? null : description.trim(),
        frequency: frequency,
        // Send the currently selected goal_id (or null if 'None'/'')
        goal_id: selectedGoalId || null,
      };
      console.log(`[EditHabitForm] Submitting update for habit ID: ${habitToEdit.habit_id}`, updatedData);

      // Call the PUT endpoint
      await apiClient.put(`/habits/${habitToEdit.habit_id}`, updatedData);

      setMessage({ text: 'Habit updated successfully!', type: 'success'});
      console.log('[EditHabitForm] Habit update successful!');

      // Close form after brief success message
      setTimeout(() => {
        // No need to check message type here, just call the callback
        onHabitUpdated();
      }, 1500); // Close form after 1.5 seconds

    } catch (err: any) {
      console.error("[EditHabitForm] Error updating habit:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to update habit";
      setMessage({ text: errorMsg, type: 'error'});
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- JSX ---
  return (
    <form onSubmit={handleUpdate}>
      {/* Local Message Alert */}
      {message.text && (
         <Alert
             icon={message.type === 'error' ? <IconAlertCircle size="1rem" /> : <IconCircleCheck size="1rem" />}
             title={message.type === 'error' ? "Update Failed" : "Success"}
             color={message.type === 'error' ? 'red' : 'green'}
             withCloseButton
             onClose={() => setMessage({ text: null, type: 'success'})}
             mb="md"
             style={{ textAlign: 'left' }}
         >
           {message.text}
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

      {/* Description Input (Using Textarea) */}
      <Textarea
        label="Description (Optional)"
        placeholder="Any notes or details"
        value={description}
        onChange={(event) => setDescription(event.currentTarget.value)}
        mb="sm"
        autosize
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
        ]}
        mb="sm" // Reduced margin
        disabled={isSubmitting}
      />

      {/* --- Goal Select --- */}
      <Select
        label="Assign to Goal (Optional)"
        placeholder="-- Select a Goal --"
        value={selectedGoalId} // Controlled by state, initialized by habit's goal_id
        onChange={setSelectedGoalId} // Update state on change
        data={goalOptions} // Use the memoized options
        mb="md"
        searchable
        clearable
        disabled={isSubmitting || goals.length === 0}
      />
      {/* --- End Goal Select --- */}

      {/* Buttons using Mantine Group */}
      <Group justify="flex-end" mt="xl">
         <Button variant="default" onClick={onCancel} disabled={isSubmitting}>
           Cancel
         </Button>
         <Button type="submit" loading={isSubmitting} color="green">
           Save Changes
         </Button>
      </Group>
    </form>
  );
};

export default EditHabitForm;