// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import axios from 'axios'; // Keep axios for direct API call here
import { useNavigate } from 'react-router-dom';
// Import Mantine components
import { TextInput, PasswordInput, Button, Box, Title, Text, Alert } from '@mantine/core';
// Optional: Import Alert icon
import { IconAlertCircle } from '@tabler/icons-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  // Use state for error message display with Alert component
  const [error, setError] = useState<string | null>(null);
  // Add loading state for the button
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  // Keep API URL (ensure port is correct)
  const API_URL = 'http://localhost:3001/api/auth/login';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null); // Clear previous errors
    setIsLoading(true); // Set loading state

    if (!email || !password) {
      setError('Please enter both email and password.');
      setIsLoading(false); // Reset loading state
      return;
    }

    try {
      console.log('Sending login request:', { email });
      // Use axios directly here as apiClient might not be set up yet or needed
      const response = await axios.post(API_URL, {
        email: email,
        password: password,
      });

      console.log('Login successful:', response.data);

      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        // Don't show message here, just redirect immediately
        // setMessage(`Login successful! Redirecting...`);
        setEmail('');
        setPassword('');
        navigate('/dashboard', { replace: true }); // Redirect immediately
      } else {
        setError('Login successful, but no token received.'); // Should not happen
      }

    } catch (err: any) {
      console.error('Login error:', err);
      if (axios.isAxiosError(err) && err.response) {
        console.error('Error response data:', err.response.data);
        setError(err.response.data.message || 'Invalid credentials or server error');
      } else {
        setError(err.message || 'An unknown network error occurred');
      }
      setPassword(''); // Clear password on failed attempt
    } finally {
      setIsLoading(false); // Reset loading state in finally block
    }
  };

  return (
    // Use Box for layout container if needed, or just return the form structure
    <Box maw={400} mx="auto"> {/* Max width 400px, centered */}
      <Title order={2} ta="center" mb="lg"> {/* Use Mantine Title */}
        Login
      </Title>

      <form onSubmit={handleSubmit}>
         {/* Display error using Mantine Alert */}
         {error && (
           <Alert icon={<IconAlertCircle size="1rem" />} title="Login Failed" color="red" withCloseButton onClose={() => setError(null)} mb="md">
             {error}
           </Alert>
         )}

        {/* Mantine TextInput for email */}
        <TextInput
          label="Email"
          placeholder="your@email.com"
          required
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          mb="md" // Add margin bottom
          disabled={isLoading}
        />

        {/* Mantine PasswordInput */}
        <PasswordInput
          label="Password"
          placeholder="Your password"
          required
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          mb="lg" // Add larger margin bottom
          disabled={isLoading}
        />

        {/* Mantine Button */}
        <Button type="submit" fullWidth loading={isLoading} colour="blue"> {/* Use loading prop */}
          Login
        </Button>
      </form>
    </Box>
  );
};

export default LoginPage;