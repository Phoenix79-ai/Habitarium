// src/pages/SettingsPage.tsx (Corrected: Added Group Import)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
// --- Mantine Imports (Added Group) ---
import { Box, Title, Text, Button, Alert, Modal, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
// --- Icons ---
import { IconAlertCircle, IconTrash, IconCheck } from '@tabler/icons-react'; // Added IconCheck

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [opened, setOpened] = useState(false); // State for modal visibility

    const handleDeleteAccount = async () => {
        setError(null);
        setIsDeleting(true);
        setOpened(false); // Close modal immediately on confirm
        console.log("[SettingsPage] Attempting account deletion...");

        try {
            await apiClient.delete('/auth/profile'); // Call backend DELETE endpoint
            console.log("[SettingsPage] Account deletion successful on backend.");

            // Clear local session data
            localStorage.removeItem('authToken');
            localStorage.removeItem('userInfo'); // Clear user info if stored

            // Show success notification
            notifications.show({
                title: 'Account Deleted',
                message: 'Your account and all data have been removed.',
                color: 'teal', // Use teal for success
                icon: <IconCheck size={18} />,
                autoClose: 4000,
            });

            // Redirect to login after notification shows
            setTimeout(() => {
                navigate('/login');
                window.location.reload(); // Force reload for clean state reset
            }, 1500); // Short delay

        } catch (err: any) {
            console.error("[SettingsPage] Error deleting account:", err);
            const msg = err.response?.data?.message || err.message || "Failed to delete account";
            setError(msg); // Show error message on the page
            setIsDeleting(false); // Stop loading indicator on error
        }
        // No finally block needed as navigation happens on success path
    };

    return (
        <Box>
            <Title order={2} mb="lg">Settings</Title>

            {/* Error display */}
            {error && (
                 <Alert icon={<IconAlertCircle size="1rem" />} title="Deletion Error" color="red" withCloseButton onClose={() => setError(null)} mb="md">
                     {error}
                 </Alert>
             )}

            {/* Danger Zone section */}
            <Title order={4} mt="xl" mb="sm" c="red">Danger Zone</Title>
            <Text mb="md" size="sm">Deleting your account is permanent and will remove all your habits, logs, and rewards. This action cannot be undone.</Text>
            <Button
                color="red"
                variant="filled"
                leftSection={<IconTrash size={16}/>}
                onClick={() => setOpened(true)} // Open confirmation modal
                loading={isDeleting} // Show loading state on button
                disabled={isDeleting} // Disable button while deleting
            >
                Delete My Account
            </Button>

             {/* Confirmation Modal */}
             <Modal
                opened={opened} // Control visibility with state
                onClose={() => setOpened(false)} // Close modal handler
                title="Confirm Account Deletion"
                centered // Center modal on screen
                size="sm" // Small size modal
             >
                <Text mb="md">Are you absolutely sure you want to delete your account? All your data will be lost forever.</Text>
                 {/* Buttons inside modal using Group */}
                 <Group justify="flex-end"> {/* Requires Group import */}
                    <Button variant="default" onClick={() => setOpened(false)} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button color="red" onClick={handleDeleteAccount} loading={isDeleting}>
                        Yes, Delete My Account
                    </Button>
                 </Group>
             </Modal>
        </Box>
    );
};

export default SettingsPage;