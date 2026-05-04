import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.tsx';

import ErrorBoundary from '@/components/common/ErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { initErrorReporting } from '@/services/errorReporting';
import { hydrate as hydrateStorage } from '@/services/storageService';
import './index.css';

async function bootstrap() {
  initErrorReporting();
  await hydrateStorage();
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary region="root">
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

void bootstrap();
