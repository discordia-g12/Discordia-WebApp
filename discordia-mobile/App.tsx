import React, { useState } from 'react';
import MobileShell from './src/components/MobileShell';
import AuthView from './src/views/AuthView';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleAuthSuccess = (user: any) => {
    console.log("Usuario autenticado:", user.username);
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <AuthView onSuccess={handleAuthSuccess} />;
  }

  return <MobileShell />;
}