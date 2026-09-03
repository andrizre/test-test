import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/Toast';
import './index.css';

const el = document.getElementById('root');
if (!el) throw new Error('Elemen #root tidak ditemukan');

createRoot(el).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
