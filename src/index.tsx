// frontend/src/index.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { SDKProvider } from '@twa-apps/sdk-react';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SDKProvider>
      <App />
    </SDKProvider>
  </React.StrictMode>,
);
