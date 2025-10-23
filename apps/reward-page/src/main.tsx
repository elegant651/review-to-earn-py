import React from 'react';
import ReactDOM from 'react-dom/client';
import { NotificationProvider, TransactionPopupProvider } from '@blockscout/app-sdk';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NotificationProvider>
      <TransactionPopupProvider>
        <App />
      </TransactionPopupProvider>
    </NotificationProvider>
  </React.StrictMode>
);
