// src/components/AddHabitForm.tsx
import React, { useState } from 'react';
import apiClient from '../services/apiClient';
// --- Mantine Imports (Corrected: Added Group) ---
import { TextInput, Select, Button, Box, Alert, Group } from '@mantine/core'; // <-- Added 'Group' here
import { IconAlertCircle } from '@tabler/icons-react';

// Props interface
interface AddHabitFormProps {
  onHabitAdded: () => void;
  onCancel: () => void;
}

const AddHabitForm: React.FC<AddHabitFormProps> = ({ onHabitAdded, onCancel }) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [frequency, setFrequency] = useState<string>('daily');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!name || !frequency) { setError("Name and frequency required."); return; }

    setIsSubmitting(true);
    try {
      await apiClient.post('/habits', {
        name: name.trim(),
        description: description.trim() === '' ? null : description.trim(),
        frequency,
      });
      setName(''); setDescription(''); setFrequency('daily'); // Reset form on success
      onHabitAdded(); // Call parent callback

    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to create habit");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        onChange={(value) => setFrequency(value || 'daily')}
        data={[
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
        mb="md"
        disabled={isSubmitting}
      />

      {/* Buttons using Mantine Group */}
      <Group justify="flex-end" mt="md"> {/* This line requires Group */}
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