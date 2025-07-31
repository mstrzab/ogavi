import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Расширяем стандартный тип Window
declare global {
  interface Window {
    Telegram: any;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root')!);

async function startApp() {
  // Даем SDK время на инициализацию (до 2 секунд)
  for (let i = 0; i < 10; i++) {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
      break; // SDK готово, выходим из цикла
    }
    await new Promise(resolve => setTimeout(resolve, 200)); // Ждем 200 мс
  }

  // Проверяем еще раз после ожидания
  if (!window.Telegram || !window.Telegram.WebApp || !window.Telegram.WebApp.initData) {
    console.error("Telegram Web App script did not load.");
    root.render(
        <div style={{fontFamily: "sans-serif", textAlign: "center", padding: "20px"}}>
          <h3>Ошибка</h3>
          <p>Не удалось загрузить компоненты Telegram. Попробуйте перезапустить приложение.</p>
        </div>
    );
    return;
  }

  // Если все хорошо, запускаем приложение
  try {
    window.Telegram.WebApp.expand();

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (e) {
    console.error(e);
  }
}

startApp();
