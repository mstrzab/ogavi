// frontend/src/App.tsx
import { useEffect, useState } from 'react';
import { useRawInitData } from '@telegram-apps/sdk-react'; // Меняем здесь
import './App.css';

const BACKEND_URL = "https://api.goviago.ru";

// Определяем тип для данных пользователя, которые придут с бэкенда
interface User {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  rating: number;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initData = useRawInitData();  

  useEffect(() => {
    if (!initData) {
      setError('Данные авторизации Telegram не найдены.');
      return;
    }

    const validateOnBackend = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/validate_user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Передаем initData в заголовке
            'X-Telegram-Init-Data': initData,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Ошибка: ${response.status}`);
        }

        const userData: User = await response.json();
        setUser(userData);

      } catch (e) {
        if (e instanceof Error) {
          setError(`Ошибка верификации: ${e.message}`);
        } else {
          setError('Произошла неизвестная ошибка');
        }
      }
    };

    validateOnBackend();
  }, [initData]);

  return (
    <div className="app-container">
      <h1>Viago Marketplace</h1>
      {user && (
        <div className="user-card">
          <h2>Добро пожаловать, {user.first_name}!</h2>
          <p>ID: {user.id}</p>
          <p>Рейтинг: {user.rating.toFixed(1)}</p>
        </div>
      )}
      {error && (
        <div className="error-card">
          <h2>Ошибка</h2>
          <p>{error}</p>
        </div>
      )}
      {!user && !error && (
        <div className="loading">
          <p>Идет верификация пользователя...</p>
        </div>
      )}
    </div>
  );
}

export default App;
