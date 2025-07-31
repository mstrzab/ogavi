// viago/frontend/src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { init } from '@telegram-apps/sdk-react';
import App from './App.tsx';
import './index.css';

// Получаем корневой элемент, куда будем рендерить приложение
const rootElement = document.getElementById('root');

// Убеждаемся, что корневой элемент существует, чтобы избежать ошибок
if (!rootElement) {
  throw new Error("Root element with id 'root' not found in the document.");
}

// Создаем корневой узел для рендеринга React-приложения
const root = ReactDOM.createRoot(rootElement);

// Создаем асинхронную функцию main для правильной инициализации SDK
async function main() {
  try {
    // Вызываем init() и ждем его завершения.
    // Эта функция подготавливает SDK к работе.
    await init();

    // После успешной инициализации рендерим наше основное приложение
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (e) {
    // Если произошла ошибка на этапе инициализации, выводим ее в консоль
    // и показываем пользователю сообщение об ошибке.
    console.error("SDK initialization error:", e);
    root.render(
      <React.StrictMode>
        <div>Критическая ошибка инициализации SDK. Пожалуйста, перезапустите приложение.</div>
      </React.StrictMode>
    );
  }
}

// Запускаем весь процесс инициализации и рендеринга
main();
