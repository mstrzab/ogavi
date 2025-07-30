// viago/frontend/src/App.tsx
import { useEffect, useState } from 'react';
import { useRawInitData } from '@telegram-apps/sdk-react';
import './App.css'; // Убедитесь, что у вас есть этот файл со стилями

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
  seller: User;
}

type Page = 'catalog' | 'profile' | 'add_ticket';

// --- Основной компонент ---
function App() {
  const initData = useRawInitData();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('catalog');

  // --- Эффект для аутентификации пользователя ---
  useEffect(() => {
    if (!initData || !initData.raw) {
      setError("Не удалось получить данные для аутентификации от Telegram.");
      return;
    }

    fetch(`${BACKEND_URL}/api/validate_user`, {
      method: 'POST',
      headers: { 'X-Telegram-Init-Data': initData.raw },
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => { throw new Error(err.detail || 'Ошибка ответа сервера') });
        }
        return response.json();
      })
      .then(data => setUser(data))
      .catch(err => setError(err.message));
  }, [initData]);

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
        {currentPage === 'add_ticket' && <AddTicketView onTicketAdded={() => setCurrentPage('catalog')} initDataRaw={initData.raw} />}
      </main>
    </div>
  );
}

// --- Компоненты для разных экранов ---

function CatalogView() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/tickets/`)
      .then(res => res.json())
      .then((data: Ticket[]) => {
        setTickets(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Загрузка билетов...</div>;
  if (tickets.length === 0) return <div>Нет билетов в продаже.</div>;

  return (
    <div className="ticket-list">
      {tickets.map(ticket => (
        <div key={ticket.id} className="ticket-card">
          <h3>{ticket.event_name}</h3>
          <p>{ticket.city}, {new Date(ticket.event_date).toLocaleDateString()}</p>
          <p className="price">{ticket.price} ₽</p>
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

function AddTicketView({ onTicketAdded, initDataRaw }: { onTicketAdded: () => void, initDataRaw: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    const formData = new FormData(event.currentTarget);
    const ticketData = {
      event_name: formData.get('event_name'),
      event_date: formData.get('event_date'),
      city: formData.get('city'),
      venue: formData.get('venue'),
      price: Number(formData.get('price')),
    };
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/tickets/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initDataRaw,
        },
        body: JSON.stringify(ticketData),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Не удалось создать билет');
      }
      onTicketAdded();
    } catch (error) {
        if(error instanceof Error) setFormError(error.message);
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
        <input name="price" type="number" placeholder="Цена в рублях" required />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Отправка...' : 'Выставить на продажу'}
        </button>
        {formError && <p className="error-text">{formError}</p>}
      </form>
    </div>
  );
}

export default App;
