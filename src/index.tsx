import React from 'react';
import ReactDOM from 'react-dom/client';
import { init } from '@telegram-apps/sdk-react';
import App from './App.tsx';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

async function main() {
  try {
    // Вызываем init() и ждем его завершения
    await init();

    // После успешной инициализации рендерим наше приложение
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (e) {
    console.error(e);
    root.render(<div>Критическая ошибка инициализации.</div>);
  }
}

// Запускаем
main();

