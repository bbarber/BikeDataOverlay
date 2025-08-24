import React from 'react';
import { AppProvider } from '../store/AppContext';
import MainLayout from './layout/MainLayout';

const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;