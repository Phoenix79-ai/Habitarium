// src/pages/LogsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
import { Box, Title, Text, Table, Loader, Alert, ScrollArea, Badge } from '@mantine/core'; // Mantine components
import { IconAlertCircle } from '@tabler/icons-react';

// Define interface for a Log entry - adjust based on backend response
interface HabitLog {
    log_id: number; // Or string UUID if applicable
    habit_id: string; // Assuming string UUID
    log_date: string; // Should be 'YYYY-MM-DD' or ISO string
    created_at: string;
    // Optional: Include habit name if backend joins it, otherwise we might need another fetch
    habit_name?: string;
}

const LogsPage: React.FC = () => {
    const [logs, setLogs] = useState<HabitLog[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        console.log("[LogsPage] Fetching logs from /api/logs...");
        try {
            // Expect the object structure from backend
            const response = await apiClient.get<{ message: string, logs: HabitLog[] } | any>('/logs');
            console.log("[LogsPage] Logs received:", response.data);

            // --- FIX: Extract the 'logs' array ---
            const logsArray = response.data?.logs;

            // Check if logsArray is actually an array
            if (Array.isArray(logsArray)) {
                // Sort the extracted array
                const sortedLogs = logsArray.sort((a, b) =>
                    new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
                );
                setLogs(sortedLogs); // Set state with the sorted array
                console.log(`[LogsPage] Successfully processed ${sortedLogs.length} logs.`);
            } else {
                // Handle case where response didn't contain a valid logs array
                console.warn("[LogsPage] response.data.logs is not an array or is missing:", response.data);
                setError("Received invalid log data structure from server.");
                setLogs([]); // Set to empty array
            }
            // --- End Fix ---
        } catch (err: any) {
            console.error("[LogsPage] Error fetching logs:", err);
            const msg = err.response?.data?.message || err.message || "Failed to fetch logs";
            setError(msg);
            // TODO: Add proper logout on 401?
        } finally {
            setIsLoading(false);
        }
    }, []); // Add dependencies if needed (e.g., filter state later)

    // Fetch logs on component mount
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Format date for display
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        } catch (e) {
            return dateString; // Return original if invalid
        }
    };

    // Create table rows
    const rows = logs.map((log) => (
        <Table.Tr key={log.log_id}>
            {/* If backend doesn't join habit name, we might only show ID or need another fetch */}
            <Table.Td>{log.habit_name || `Habit ID: ${log.habit_id}`}</Table.Td>
            <Table.Td>{formatDate(log.log_date)}</Table.Td>
            {/* Optional: Add a timestamp for when it was logged */}
            {/* <Table.Td>{new Date(log.created_at).toLocaleString()}</Table.Td> */}
        </Table.Tr>
    ));

    return (
        <Box>
            <Title order={2} mb="lg">Habit Log History</Title>

            {error && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Error Loading Logs" color="red" mb="md">
                    {error}
                </Alert>
            )}

            {isLoading && <Loader />}

            {!isLoading && !error && (
                logs.length > 0 ? (
                    // Use ScrollArea for potentially long tables
                    <ScrollArea>
                        <Table striped highlightOnHover withTableBorder withColumnBorders>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Habit</Table.Th>
                                    <Table.Th>Date Logged</Table.Th>
                                    {/* <Table.Th>Timestamp</Table.Th> */}
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>{rows}</Table.Tbody>
                        </Table>
                    </ScrollArea>
                ) : (
                    <Text>No logs found yet. Start logging your habits!</Text>
                )
            )}
        </Box>
    );
};

export default LogsPage;