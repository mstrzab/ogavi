import React from 'react';
import ReactDOM from 'react-dom/client';
import { init, retrieveLaunchParams } from '@telegram-apps/sdk-react';
import App from './App.tsx';
import './index.css';

// Расширяем стандартный тип Window, чтобы TypeScript знал о window.Telegram
declare global {
  interface Window {
    Telegram: any;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root')!);

// Сначала проверяем, есть ли вообще параметры запуска (запущены ли мы в Telegram)
try {
  retrieveLaunchParams();

  // Если код дошел до сюда, значит мы в Telegram. Инициализируем SDK.
  init();
  
  // Сразу после init, просим расширить окно
  window.Telegram.WebApp.expand();

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

} catch (e) {
  // Этот блок сработает, если приложение открыто в обычном браузере
  // Можно показать заглушку или сообщение об ошибке
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="font-family: sans-serif; text-align: center; padding: 20px;">
        <h3>Oops</h3>
        <p>Это приложение предназначено для запуска внутри Telegram.</p>
      </div>
    `;
  }
  console.error(e);
}
