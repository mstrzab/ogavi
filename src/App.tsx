// viago/frontend/src/App.tsx - v2.0
import { useEffect, useState } from 'react';
import { useRawInitData, useWebApp } from '@telegram-apps/sdk-react';
import './App.css';

const BACKEND_URL = "https://api.goviago.ru";

// --- Типы данных ---
interface User {
  id: number;
  first_name: string;
  rating: number;
}

interface Ticket {
  id: number;
  event_name: string;
  event_date: string;
  city: string;
  venue: string;
  price: number;
  sector?: string;
  row?: string;
  seat?: string;
  seller: User;
}

type Page = 'catalog' | 'profile' | 'add_ticket';

// --- Основной компонент ---
function App() {
  const initDataRaw = useRawInitData();
  const WebApp = useWebApp();

  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('catalog');

  // --- Эффект для аутентификации пользователя ---
  useEffect(() => {

    if (WebApp){
        WebApp.expand();
    }
    if (!initDataRaw) {
      // setError("Не удалось получить данные для аутентификации от Telegram.");
      return;
    }

    fetch(`${BACKEND_URL}/api/validate_user`, {
      method: 'POST',
      headers: { 'X-Telegram-Init-Data': initDataRaw },
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => { throw new Error(err.detail || 'Ошибка ответа сервера') });
        }
        return response.json();
      })
      .then(data => setUser(data))
      .catch(err => setError(err.message));
  }, [initDataRaw]);

  // --- Отображение в зависимости от состояния ---
  if (error) {
    return <div className="error-card">Ошибка: {error}</div>;
  }

  if (!user) {
    return <div className="loading">Идет верификация...</div>;
  }

  return (
    <div className="app-container">
      <header>
        <h1>Viago Marketplace</h1>
        <nav>
          <button onClick={() => setCurrentPage('catalog')} disabled={currentPage === 'catalog'}>Каталог</button>
          <button onClick={() => setCurrentPage('profile')} disabled={currentPage === 'profile'}>Профиль</button>
        </nav>
      </header>
      <main>
        {currentPage === 'catalog' && <CatalogView />}
        {currentPage === 'profile' && <ProfileView user={user} onNavigate={setCurrentPage} />}
        {currentPage === 'add_ticket' && <AddTicketView onTicketAdded={() => setCurrentPage('catalog')} initDataRaw={initDataRaw} />}
      </main>
    </div>
  );
}

// --- Компоненты для разных экранов ---

function CatalogView() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/tickets/`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Не удалось загрузить билеты');
        }
        return res.json();
      })
      .then((data: Ticket[]) => {
        setTickets(data);
      })
      .catch(() => setFetchError('Произошла ошибка при загрузке.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Загрузка билетов...</div>;
  if (fetchError) return <div className="error-card">{fetchError}</div>;
  if (tickets.length === 0) return <div>Нет билетов в продаже.</div>;

  return (
    <div className="ticket-list">
      <h2>Каталог билетов</h2>
      {tickets.map(ticket => (
        <div key={ticket.id} className="ticket-card">
          <div className="ticket-card-main">
              <h3>{ticket.event_name}</h3>
              <p className="venue">{ticket.city}, {ticket.venue}</p>
              <p className="date">{new Date(ticket.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              {(ticket.sector || ticket.row || ticket.seat) &&
                  <p className="seat-info">
                      {ticket.sector && `Сектор ${ticket.sector}`}
                      {ticket.row && ` • Ряд ${ticket.row}`}
                      {ticket.seat && ` • Место ${ticket.seat}`}
                  </p>
              }
          </div>
          <div className="ticket-card-aside">
              <p className="price">{ticket.price} ₽</p>
              <button className="buy-button">Купить</button>
          </div>
        </div>
      ))}
    </div>
   );
}

function ProfileView({ user, onNavigate }: { user: User, onNavigate: (page: Page) => void }) {
  return (
    <div className="profile-view">
      <h2>Профиль</h2>
      <div className="user-card">
        <p><strong>Имя:</strong> {user.first_name}</p>
        <p><strong>ID:</strong> {user.id}</p>
        <p><strong>Рейтинг:</strong> {user.rating.toFixed(1)}</p>
      </div>
      <button className="add-ticket-btn" onClick={() => onNavigate('add_ticket')}>+ Продать билет</button>
    </div>
  );
}

function AddTicketView({ onTicketAdded, initDataRaw }: { onTicketAdded: () => void, initDataRaw: string | undefined }) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!initDataRaw) {
      setFormError("Ошибка: данные пользователя не найдены. Попробуйте перезапустить приложение.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    // Проверяем, что файл был выбран
    const ticketFile = formData.get('ticket_file');
    if (!ticketFile || !(ticketFile instanceof File) || ticketFile.size === 0) {
      setFormError("Пожалуйста, выберите файл билета.");
      return;
    }
    
    setSubmitting(true);
    setFormError('');

    try {
      // FormData сам установит правильный заголовок 'multipart/form-data'.
      // Нам не нужно указывать Content-Type.
      const response = await fetch(`${BACKEND_URL}/api/tickets/`, {
        method: 'POST',
        headers: {
          // Важно НЕ указывать 'Content-Type', браузер сделает это сам с нужным boundary
          'X-Telegram-Init-Data': initDataRaw,
        },
        body: formData, // Отправляем FormData напрямую
      });

      if (!response.ok) {
        // Пытаемся получить ошибку в формате JSON, как ее отдает FastAPI
        const err = await response.json();
        throw new Error(err.detail || 'Не удалось создать билет. Проверьте введенные данные.');
      }
      
      // Если все успешно, вызываем коллбэк для перехода на другую страницу
      onTicketAdded();

    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Произошла неизвестная ошибка');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-ticket-view">
      <h2>Новый билет</h2>
      <form onSubmit={handleSubmit}>
        <input name="event_name" placeholder="Название мероприятия" required />
        <input name="event_date" type="date" required />
        <input name="city" placeholder="Город" required />
        <input name="venue" placeholder="Место проведения" required />
        <input name="sector" placeholder="Сектор (необязательно)" />
        <input name="row" placeholder="Ряд (необязательно)" />
        <input name="seat" placeholder="Место (необязательно)" />
        <input name="price" type="number" step="0.01" placeholder="Цена в рублях" required />
        
        <label htmlFor="ticket_file_input">Файл билета (PDF, JPG, PNG):</label>
        <input 
          id="ticket_file_input" 
          name="ticket_file" 
          type="file" 
          accept=".pdf,.jpg,.jpeg,.png" 
          required 
        />
        
        <button type="submit" disabled={submitting}>
          {submitting ? 'Отправка...' : 'Выставить на продажу'}
        </button>
        {formError && <p className="error-text">{formError}</p>}
      </form>
    </div>
  );
}

export default App;
