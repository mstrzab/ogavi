import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Расширение типа Window для TypeScript
declare global {
  interface Window {
    Telegram: any;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root')!);

const startApp = async () => {
  try {
    // Ждем, пока скрипт Telegram загрузится
    await new Promise<void>((resolve, reject) => {
      if (window.Telegram && window.Telegram.WebApp) {
        return resolve();
      }
      const timeout = setTimeout(() => reject(new Error('Telegram SDK timeout')), 2000);
      document.addEventListener('telegram.WebApp.ready', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
    });

    // Инициализируем и расширяем
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize Telegram SDK', error);
    root.render(
      <div>Ошибка инициализации. Пожалуйста, перезапустите приложение.</div>
    );
  }
};

startApp();
