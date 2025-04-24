// src/App.tsx (Corrected: Includes Menu Fix AND Root Redirect)

import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom'; // Ensure Navigate is imported
// Mantine Imports
import {
    AppShell, Title, Text, Anchor, Divider, Box, Group, Button,
    ActionIcon, useMantineColorScheme,
    Menu, Avatar // Keep Menu, Avatar
} from '@mantine/core';
// Icon Imports
import {
    IconLogout, IconSun, IconMoonStars, IconSettings, IconListDetails,
    IconLayoutDashboard, IconAward, IconCoin // Keep needed icons
} from '@tabler/icons-react';

// Page Components & Auth
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import LogsPage from './pages/LogsPage';
import RewardsPage from './pages/RewardsPage';
import MyRewardsPage from './pages/MyRewardsPage';
import SettingsPage from './pages/SettingsPage';
import ProtectedRoute from './components/ProtectedRoute';

// --- Inner Layout Component ---
function MainLayout() {
  const isLoggedIn = !!localStorage.getItem('authToken');
  let userInitial = '?';
  try { const storedUser = localStorage.getItem('userInfo'); if (storedUser) { userInitial = JSON.parse(storedUser)?.username?.[0]?.toUpperCase() || '?'; } } catch (e) {}

  const navigate = useNavigate();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const handleNavLogout = () => {
      localStorage.removeItem('authToken'); localStorage.removeItem('userInfo');
      navigate('/login'); window.location.reload(); // Force reload for clean state
  };

  return (
    <AppShell padding="md">
      <AppShell.Main>
        {/* Header */}
        <Group justify="space-between" align="center" mb="xl">
            <Title order={1}> Habitarium </Title>
             <Group> {/* Right Side Controls */}
                <ActionIcon variant="default" onClick={() => toggleColorScheme()} title="Toggle color scheme" size="lg" radius="md">
                   {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoonStars size={18} />}
                </ActionIcon>
                {!isLoggedIn ? (
                    <Group> <Anchor component={NavLink} to="/login" fw={500}>Login</Anchor> <Anchor component={NavLink} to="/register" fw={500}>Register</Anchor> </Group>
                 ) : (
                    // Logged In: User Menu
                    <Menu shadow="md" width={200} position="bottom-end">
                        <Menu.Target>
                            {/* FIX: Wrap Avatar in a div */}
                            <div style={{ display: 'inline-block' }}>
                                <Avatar color="red" radius="xl" style={{ cursor: 'pointer' }} title="Account Menu">{userInitial}</Avatar>
                            </div>
                            {/* End Wrap */}
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Label>Application</Menu.Label>
                             <Menu.Item leftSection={<IconLayoutDashboard size={14} />} component={NavLink} to="/dashboard"> Dashboard </Menu.Item>
                             <Menu.Item leftSection={<IconListDetails size={14} />} component={NavLink} to="/logs"> View Logs </Menu.Item>
                             <Menu.Item leftSection={<IconCoin size={14} />} component={NavLink} to="/rewards"> Rewards Shop </Menu.Item>
                             <Menu.Item leftSection={<IconAward size={14} />} component={NavLink} to="/my-rewards"> My Rewards </Menu.Item>
                            <Menu.Divider />
                            <Menu.Label>Account</Menu.Label>
                            <Menu.Item leftSection={<IconSettings size={14} />} component={NavLink} to="/settings"> Settings </Menu.Item>
                            <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={handleNavLogout}> Logout </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                 )}
             </Group>
        </Group>

        {/* Routes Content Area */}
        <Box maw={1100} mx="auto" mt="md">
           <Routes>
             {/* --- Root Route Redirect --- */}
             {/* Always try to go to dashboard; ProtectedRoute handles auth */}
             <Route path="/" element={<Navigate to="/dashboard" replace />} />
             {/* --- End Redirect --- */}

             {/* Public Routes */}
             <Route path="/login" element={<LoginPage />} />
             <Route path="/register" element={<RegisterPage />} />
             {/* Protected Routes */}
             <Route element={<ProtectedRoute />}>
               <Route path="/dashboard" element={<DashboardPage />} />
               <Route path="/logs" element={<LogsPage />} />
               <Route path="/rewards" element={<RewardsPage />} />
               <Route path="/my-rewards" element={<MyRewardsPage />} />
               <Route path="/settings" element={<SettingsPage />} />
             </Route>
             {/* Fallback Route */}
             <Route path="*" element={<Text ta="center">Page Not Found</Text>} />
           </Routes>
        </Box>

      </AppShell.Main>
    </AppShell>
  );
}

// --- Main App Component ---
function App() { return ( <Router> <MainLayout /> </Router> ); }
export default App;