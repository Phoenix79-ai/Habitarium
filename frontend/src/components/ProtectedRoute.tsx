import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute: React.FC = () => {
  const token = localStorage.getItem('authToken');

  // If token exists, render the child component (specified in the Route)
  // The <Outlet /> component renders the matched child route element.
  // If no token, redirect to the /login page
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;