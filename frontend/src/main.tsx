// src/main.tsx (Corrected Theme Setup)

import React from 'react';
import ReactDOM from 'react-dom/client';
import '@mantine/core/styles.css';
import { MantineProvider, createTheme } from '@mantine/core'; // Import createTheme
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import App from './App.tsx';
import './index.css'; // Keep for minimal body styles if needed

// --- Define Custom Theme ---
const theme = createTheme({
  // Set Primary Color (used by default Button variant='filled')
 // primaryColor: 'red', // Mantine color name (e.g., 'red', 'blue', 'grape')
  //primaryShade: { light: 7, dark: 8 }, // Shade index (0-9) for light/dark modes

  // Set Default Color Scheme
  defaultColorScheme: 'dark',

  // --- Optional Overrides (Examples) ---
  // Define custom colors if needed (must be an array of 10 shades)
  // colors: {
  //   'brand-maroon': ['#f8e...', ..., '#9b2c2c', ..., '#4a0e0e'],
  // },

  // Set default border radius
  // radius: 'md', // Default is 'sm'

  // Set default font
  // fontFamily: 'Inter, sans-serif',

  // Set default props for specific components
  // components: {
  //    Button: { defaultProps: { radius: 'xl' } },
  //    Paper: { defaultProps: { shadow: 'none', withBorder: false } },
  // }
});

// --- Render App ---
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    {/* Pass the custom theme object to the provider */}
    <MantineProvider theme={theme} defaultColorScheme='dark' withGlobalStyles withNormalizeCSS>
      <Notifications position="top-right" zIndex={1000}/> {/* Set zIndex high if needed */}
      <App />
    </MantineProvider>
  </React.StrictMode>,
);