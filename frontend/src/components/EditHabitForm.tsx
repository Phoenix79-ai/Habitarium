// src/components/EditHabitForm.tsx (Complete with Local Feedback)

import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { Habit } from '../pages/DashboardPage'; // Import the Habit type
// --- Mantine Imports ---
import { TextInput, Select, Button, Alert, Group } from '@mantine/core'; // Removed Box as it wasn't used
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react'; // Import Check icon

// Props interface
interface EditHabitFormProps {
  habitToEdit: Habit;
  onHabitUpdated: () => void; // Callback function on successful update
  onCancel: () => void;     // Callback function to cancel editing
}

const EditHabitForm: React.FC<EditHabitFormProps> = ({ habitToEdit, onHabitUpdated, onCancel }) => {
  // State initialized from props
  const [name, setName] = useState<string>(habitToEdit.name);
  const [description, setDescription] = useState<string>(habitToEdit.description || '');
  const [frequency, setFrequency] = useState<string>(habitToEdit.frequency);
  // --- State for LOCAL messages ---
  const [message, setMessage] = useState<{ text: string | null, type: 'success' | 'error' }>({ text: null, type: 'success' });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Effect to update form if the selected habit changes
  useEffect(() => {
    setName(habitToEdit.name);
    setDescription(habitToEdit.description || '');
    setFrequency(habitToEdit.frequency);
    setMessage({ text: null, type: 'success'}); // Clear message when habit changes
    setIsSubmitting(false);
  }, [habitToEdit]); // Re-run effect if habitToEdit object changes


  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage({ text: null, type: 'success'}); // Clear previous message on new submit attempt
    if (!name || !frequency) {
      setMessage({ text: "Habit name and frequency are required.", type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedData = {
        name: name.trim(),
        description: description.trim() === '' ? null : description.trim(),
        frequency: frequency,
      };
      console.log(`[EditHabitForm] Submitting update for habit ID: ${habitToEdit.habit_id}`, updatedData);
      await apiClient.put(`/habits/${habitToEdit.habit_id}`, updatedData);

      // --- Set LOCAL success message ---
      setMessage({ text: 'Habit updated successfully!', type: 'success'});
      console.log('[EditHabitForm] Habit update successful!');

      // Automatically call parent's update callback *after* showing success briefly
      setTimeout(() => {
        // Check if message is still success before closing, in case user interacted again
        // This check might be overly cautious depending on desired UX
        if (message.type === 'success') {
             onHabitUpdated();
        }
        // If we wanted message to clear automatically:
        // setMessage({ text: null, type: 'success'});
      }, 1500); // Close form after 1.5 seconds on success

    } catch (err: any) {
      console.error("[EditHabitForm] Error updating habit:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to update habit";
      // --- Set LOCAL error message ---
      setMessage({ text: errorMsg, type: 'error'});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // No extra Paper needed, DashboardPage wraps it
    <form onSubmit={handleUpdate}>
      {/* --- Render LOCAL Message Alert --- */}
      {message.text && (
         <Alert
             icon={message.type === 'error' ? <IconAlertCircle size="1rem" /> : <IconCircleCheck size="1rem" />}
             title={message.type === 'error' ? "Update Failed" : "Success"}
             color={message.type === 'error' ? 'red' : 'green'}
             withCloseButton
             onClose={() => setMessage({ text: null, type: 'success'})} // Allow closing message manually
             mb="md" // Margin bottom
             style={{ textAlign: 'left' }}
         >
           {message.text}
         </Alert>
       )}
       {/* --- End Local Message --- */}

      {/* Name Input */}
      <TextInput
        label="Habit Name"
        placeholder="e.g., Drink Water, Read Book"
        required
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
        mb="sm" // Mantine spacing
        disabled={isSubmitting}
      />

      {/* Description Input */}
      <TextInput
        label="Description (Optional)"
        placeholder="Any notes or details"
        value={description}
        onChange={(event) => setDescription(event.currentTarget.value)}
        mb="sm"
        disabled={isSubmitting}
      />

      {/* Frequency Select */}
      <Select
        label="Frequency"
        required
        value={frequency}
        onChange={(value) => setFrequency(value || 'daily')} // Handle null case from Select
        data={[ // Ensure data format is { value: string, label: string }
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
        mb="md" // Slightly more space before buttons
        disabled={isSubmitting}
      />

      {/* Buttons using Mantine Group */}
      <Group justify="flex-end" mt="xl"> {/* Increased margin */}
         <Button variant="default" onClick={onCancel} disabled={isSubmitting}>
           Cancel
         </Button>
         <Button type="submit" loading={isSubmitting} color="green"> {/* Green Save button */}
           Save Changes
         </Button>
      </Group>
    </form>
  );
};

export default EditHabitForm;