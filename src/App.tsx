// frontend/src/App.tsx
import { useEffect, useState } from 'react';
import './App.css';

// ВАЖНО: Замени 'YOUR_SERVER_IP' на реальный IP-адрес твоего сервера,
// где запущен Docker. Порт должен быть 8001, как мы настроили.
const BACKEND_URL = "http://91.108.240.117:8001";

function App() {
  const [backendStatus, setBackendStatus] = useState('Проверяем соединение...');

  useEffect(() => {
    // Эта функция выполнится один раз при загрузке приложения
    const checkBackend = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/healthcheck`);
        if (!response.ok) {
          throw new Error(`Ошибка сети: ${response.status}`);
        }
        const data = await response.json();
        if (data.status === 'ok') {
          setBackendStatus('✅ Бэкенд на связи!');
        } else {
          setBackendStatus('❌ Бэкенд ответил, но статус не "ok"');
        }
      } catch (error) {
        console.error("Ошибка при запросе к бэкенду:", error);
        setBackendStatus('❌ Не удалось подключиться к бэкенду. Проверь URL и CORS.');
      }
    };

    checkBackend();
  }, []); // Пустой массив зависимостей означает, что эффект выполнится 1 раз

  return (
    <div className="app-container">
      <h1>Добро пожаловать в Viago!</h1>
      <p>Это наш будущий маркетплейс билетов.</p>
      <div className="status-card">
        <p>Статус системы:</p>
        <code>{backendStatus}</code>
      </div>
    </div>
  );
}

export default App;
