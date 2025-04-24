// src/pages/RegisterPage.tsx
import React, { useState } from 'react';
import axios from 'axios';
// Import Mantine components
import { TextInput, PasswordInput, Button, Box, Title, Text, Alert } from '@mantine/core';
// Optional: Import Alert icon
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react'; // Add Check icon

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  // Separate states for error and success messages
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const API_URL = 'http://localhost:3001/api/auth/register'; // Ensure port is correct

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);        // Clear previous messages
    setSuccessMessage(null);
    setIsLoading(true);    // Set loading

    if (!username || !email || !password) {
      setError('Please enter username, email, and password.');
      setIsLoading(false); // Reset loading
      return;
    }

    try {
      console.log('Sending registration request:', { username, email });
      const response = await axios.post(API_URL, {
        username: username.trim(), // Trim username
        email: email.trim(),     // Trim email
        password: password,      // Don't trim password
      });

      console.log('Registration successful:', response.data);
      setSuccessMessage(`Registration successful for ${username}! You can now log in.`); // Set success message
      setUsername(''); // Clear form
      setEmail('');
      setPassword('');

    } catch (err: any) {
      console.error('Registration error:', err);
      if (axios.isAxiosError(err) && err.response) {
        console.error('Error response data:', err.response.data);
        setError(err.response.data.message || 'Registration failed: Server error');
      } else {
        setError(err.message || 'Registration failed: An unknown error occurred');
      }
    } finally {
      setIsLoading(false); // Reset loading
    }
  };

  return (
    <Box maw={400} mx="auto"> {/* Max width 400px, centered */}
      <Title order={2} ta="center" mb="lg">
        Register
      </Title>

      <form onSubmit={handleSubmit}>
        {/* Display error using Mantine Alert */}
        {error && (
           <Alert icon={<IconAlertCircle size="1rem" />} title="Registration Failed" color="red" withCloseButton onClose={() => setError(null)} mb="md">
             {error}
           </Alert>
         )}
         {/* Display success using Mantine Alert */}
         {successMessage && (
            <Alert icon={<IconCircleCheck size="1rem" />} title="Registration Successful" color="green" withCloseButton onClose={() => setSuccessMessage(null)} mb="md">
                {successMessage}
            </Alert>
         )}

        {/* Mantine TextInput for username */}
        <TextInput
          label="Username"
          placeholder="Choose a username"
          required
          value={username}
          onChange={(event) => setUsername(event.currentTarget.value)}
          mb="md" // margin-bottom: medium
          disabled={isLoading}
        />

        {/* Mantine TextInput for email */}
        <TextInput
          label="Email"
          placeholder="your@email.com"
          type="email" // Set input type
          required
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          mb="md"
          disabled={isLoading}
        />

        {/* Mantine PasswordInput */}
        <PasswordInput
          label="Password"
          placeholder="Choose a password"
          required
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          mb="lg" // margin-bottom: large
          disabled={isLoading}
        />

        {/* Mantine Button */}
        <Button type="submit" fullWidth loading={isLoading} colour="blue">
          Register
        </Button>
      </form>
    </Box>
  );
};

export default RegisterPage;