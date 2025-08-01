// viago/frontend/src/App.tsx - v2.0
import { useEffect, useState } from 'react';
import { useRawInitData } from '@telegram-apps/sdk-react';
import './App.css';

const BACKEND_URL = "https://api.goviago.ru"; // Убедитесь, что этот URL верен

// Интерфейсы для данных, получаемых с бэкенда
interface User {
  id: number;
  first_name: string;
  rating: number;
  balance: number; // Теперь это число, т.к. мы его парсим
}

interface UserBase {
  id: number;
  first_name: string;
  rating: number;
}

// Обновленный интерфейс Ticket, соответствующий schemas.TicketInCatalog на бэкенде
interface Ticket {
  id: number;
  event_name: string;
  event_date: string; // Дата приходит как строка (YYYY-MM-DD)
  city: string;
  venue: string;
  price: number; // Цена приходит как Decimal (строка), парсим в число
  sector?: string;
  row?: string;
  seat?: string;
  status: 'available' | 'sold' | 'archived'; // Использование литеральных типов для статусов
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
      // В режиме разработки, если нет initDataRaw, используем заглушку пользователя
      console.warn("No Telegram InitData available. Running in development mode with mock user.");
      setUser({
        id: 12345,
        first_name: "Тестовый Пользователь",
        rating: 4.8,
        balance: 1000.50,
      });
      return; // Выходим, чтобы не делать запрос к бэкенду без initData
    }

    fetch(`${BACKEND_URL}/api/validate_user`, {
      method: 'POST',
      headers: { 'X-Telegram-Init-Data': initDataRaw },
    })
      .then(response => {
        if (!response.ok) {
          // Если ответ не ОК, пытаемся прочитать ошибку из JSON
          return response.json().then(err => { throw new Error(err.detail || 'Ошибка ответа сервера') });
        }
        return response.json();
      })
      .then(data => {
        // !!! ВАЖНО: Преобразуем баланс из строки (который приходит от Decimal) в число
        if (typeof data.balance === 'string') {
          data.balance = parseFloat(data.balance);
        }
        setUser(data);
      })
      .catch(err => {
        setError(err.message);
        console.error("Ошибка верификации пользователя:", err);
      });
  }, [initDataRaw]);

  // --- Отображение в зависимости от состояния ---
  if (error) {
    return <div className="error-card">Ошибка: {error}</div>;
  }

  // Показываем "Идет верификация..." только если initDataRaw есть (мы в Telegram)
  if (!user && initDataRaw) {
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
        {/* Передаем initDataRaw в CatalogView, так как он нужен для покупки */}
        {currentPage === 'catalog' && <CatalogView initDataRaw={initDataRaw} />}
        {currentPage === 'profile' && <ProfileView user={user!} onNavigate={setCurrentPage} />} {/* user! - уверенность что user не null */}
        {currentPage === 'add_ticket' && initDataRaw && <AddTicketView onTicketAdded={() => setCurrentPage('catalog')} initDataRaw={initDataRaw} />}
      </main>
    </div>
  );
}


// CatalogView теперь принимает initDataRaw
function CatalogView({ initDataRaw }: { initDataRaw: string | undefined }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = () => {
    setLoading(true);
    setError(null);
    fetch(`${BACKEND_URL}/api/tickets/`)
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.detail || 'Ошибка загрузки билетов') });
        }
        return res.json();
      })
      .then((data: Ticket[]) => {
        // Парсим поля Decimal (price) из строки в число
        const parsedTickets = data.map(ticket => ({
          ...ticket,
          price: typeof ticket.price === 'string' ? parseFloat(ticket.price) : ticket.price,
        }));
        setTickets(parsedTickets);
      })
      .catch(err => {
        setError(err.message);
        console.error("Ошибка загрузки билетов:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchTickets, []); // Загружаем билеты при монтировании компонента

  const handleBuy = async (ticketId: number) => {
    if (!initDataRaw) {
      alert("Ошибка: данные пользователя не найдены для покупки. Пожалуйста, перезапустите приложение в Telegram.");
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
      fetchTickets(); // Обновляем список билетов после покупки
    } catch (err) {
      if (err instanceof Error) alert(`Ошибка: ${err.message}`);
      else alert("Произошла неизвестная ошибка при покупке.");
      console.error("Ошибка при покупке билета:", err);
    }
  };

  if (loading) return <div className="loading">Загрузка билетов...</div>;
  if (error) return <div className="error-card">{error}</div>;

  // Фильтруем билеты по статусу 'available', статус теперь приходит с бэкенда
  const availableTickets = tickets.filter(t => t.status === 'available'); 
  if (availableTickets.length === 0) return <div className="loading">Нет билетов в продаже.</div>;

  return (
    <div className="ticket-list">
      <h2>Каталог билетов</h2>
      {availableTickets.map(ticket => (
        <div key={ticket.id} className="ticket-card">
          <div className="ticket-card-main">
              <h3>{ticket.event_name}</h3>
              <p className="venue">{ticket.venue}, {ticket.city}</p>
              {/* Форматирование даты на русском */}
              <p className="date">{new Date(ticket.event_date).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              {/* Условное отображение информации о местах */}
              {(ticket.sector || ticket.row || ticket.seat) && (
                  <p className="seat-info">
                      {ticket.sector && `Сектор: ${ticket.sector}`}
                      {ticket.row && ` Ряд: ${ticket.row}`}
                      {ticket.seat && ` Место: ${ticket.seat}`}
                  </p>
              )}
              <p className="seller">Продавец: {ticket.seller.first_name} (Рейтинг: {ticket.seller.rating.toFixed(1)})</p>
          </div>
          <div className="ticket-card-aside">
              <p className="price">{ticket.price.toFixed(2)} ₽</p> {/* Цена теперь число, можно использовать toFixed */}
              <button className="buy-btn" onClick={() => handleBuy(ticket.id)}>Купить</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ProfileView получает гарантированно числовой баланс
function ProfileView({ user, onNavigate }: { user: User; onNavigate: (page: Page) => void }) {
  return (
    <div className="profile-view">
      <h2>Профиль</h2>
      <div className="user-card">
        <p><strong>Имя:</strong> {user.first_name}</p>
        <p><strong>ID:</strong> {user.id}</p>
        <p><strong>Рейтинг:</strong> {user.rating.toFixed(1)}</p>
        <p><strong>Баланс:</strong> {user.balance.toFixed(2)} ₽</p> {/* toFixed теперь работает корректно */}
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
    
    // Валидация цены, так как input type="number" может вернуть пустую строку
    const priceValue = formData.get('price');
    if (priceValue === null || priceValue === '' || isNaN(Number(priceValue))) {
        setFormError("Пожалуйста, введите корректную цену.");
        setSubmitting(false);
        return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/tickets/`, {
        method: 'POST',
        headers: {
          'X-Telegram-Init-Data': initDataRaw,
          // 'Content-Type': 'multipart/form-data' НЕ нужно устанавливать,
          // fetch делает это автоматически для FormData и устанавливает правильный boundary
        },
        body: formData,
      });

      if (!response.ok) {
        // Попытка прочитать детальную ошибку с сервера
        const err = await response.json().catch(() => ({ detail: 'Не удалось обработать ошибку сервера' }));
        throw new Error(err.detail || 'Не удалось создать билет.');
      }

      alert('Билет успешно выставлен на продажу!');
      onTicketAdded(); // Переход на страницу каталога после успешного добавления

    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Произошла неизвестная ошибка');
      }
      console.error("Ошибка при добавлении билета:", error);
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
        {/* step="0.01" для точности копеек */}
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
