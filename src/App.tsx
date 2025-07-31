// viago/frontend/src/App.tsx - v2.0
import { useEffect, useState } from 'react';
import { useRawInitData } from '@telegram-apps/sdk-react';
import './App.css';

const BACKEND_URL = "https://api.goviago.ru";

interface User {
  id: number;
  first_name: string;
  rating: number;
  balance: number;
}

interface UserBase {
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
  status: string; 
  seller: UserBase;
}

type Page = 'catalog' | 'profile' | 'add_ticket';

function App() {
  const initDataRaw = useRawInitData();

  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('catalog');

  useEffect(() => {

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
        {currentPage === 'add_ticket' && initDataRaw && <AddTicketView onTicketAdded={() => setCurrentPage('catalog')} initDataRaw={initDataRaw} />}
      </main>
    </div>
  );
}


function CatalogView() {
  const initDataRaw = useRawInitData();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = () => {
    setLoading(true);
    setError(null);
    fetch(`${BACKEND_URL}/api/tickets/`)
      .then(res => res.json())
      .then((data: Ticket[]) => setTickets(data))
      .catch(() => setError('Ошибка загрузки билетов'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchTickets, []);

  const handleBuy = async (ticketId: number) => {
    if (!initDataRaw) {
      alert("Ошибка: данные пользователя не найдены.");
      return;
    }
    if (!confirm("Вы уверены, что хотите купить этот билет?")) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/tickets/${ticketId}/buy`, {
        method: 'POST',
        headers: { 'X-Telegram-Init-Data': initDataRaw },
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Не удалось купить билет');
      }
      alert("Билет успешно куплен!");
      fetchTickets(); // Обновляем список билетов
    } catch (err) {
      if (err instanceof Error) alert(`Ошибка: ${err.message}`);
    }
  };

  if (loading) return <div className="loading">Загрузка билетов...</div>;
  if (error) return <div className="error-card">{error}</div>;
  const availableTickets = tickets.filter(t => t.status === 'available');
  if (availableTickets.length === 0) return <div>Нет билетов в продаже.</div>;

  return (
    <div className="ticket-list">
      <h2>Каталог билетов</h2>
      {availableTickets.map(ticket => (
        <div key={ticket.id} className="ticket-card">
          {/* ... инфо о билете ... */}
          <button className="buy-btn" onClick={() => handleBuy(ticket.id)}>Купить за {ticket.price} ₽</button>
        </div>
      ))}
    </div>
  );
}

function ProfileView({ user, onNavigate }: { user: User; onNavigate: (page: Page) => void }) {
  return (
    <div className="profile-view">
      <h2>Профиль</h2>
      <div className="user-card">
        <p><strong>Имя:</strong> {user.first_name}</p>
        <p><strong>ID:</strong> {user.id}</p>
        <p><strong>Рейтинг:</strong> {user.rating.toFixed(1)}</p>
        <p><strong>Баланс:</strong> {user.balance ? user.balance.toFixed(2) : '0.00'} ₽</p>
      </div>
      <button className="add-ticket-btn" onClick={() => onNavigate('add_ticket')}>
        + Продать билет
      </button>
    </div>
  );
}

function AddTicketView({ onTicketAdded, initDataRaw }: { onTicketAdded: () => void; initDataRaw: string; }) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    const form = event.currentTarget;
    const formData = new FormData(form);

    const ticketFile = formData.get('ticket_file');
    if (!ticketFile || !(ticketFile instanceof File) || ticketFile.size === 0) {
      setFormError("Пожалуйста, выберите файл билета.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/tickets/`, {
        method: 'POST',
        headers: {
          'X-Telegram-Init-Data': initDataRaw,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Не удалось обработать ошибку сервера' }));
        throw new Error(err.detail || 'Не удалось создать билет.');
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
