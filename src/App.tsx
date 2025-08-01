// viago/frontend/src/App.tsx - v3.0
import React, { useState, useEffect } from 'react';
import { useRawInitData } from '@telegram-apps/sdk-react';
import { HomeIcon, PlusSquareIcon, UserIcon, SearchIcon, ArrowLeftIcon } from './Icons';
import './App.css';

// --- КОНСТАНТЫ И ТИПЫ ---
const BACKEND_URL = "https://api.goviago.ru";
type Tab = 'catalog' | 'sell' | 'profile';

interface User {
  id: number;
  first_name: string;
  rating: number;
  balance: number;
}
interface Ticket {
  id: number;
  event_name: string;
  event_date: string;
  price: number;
  status: 'available' | 'sold' | 'archived';
  seller: { id: number; first_name: string; rating: number };
}
interface EventInfo {
    event_name: string;
    event_date: string;
    city: string;
    venue: string;
}

// --- ОСНОВНОЙ КОМПОНЕНТ APP ---
function App() {
  const initDataRaw = useRawInitData();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('catalog');

  // Эффект для аутентификации пользователя
  useEffect(() => {
    if (!initDataRaw) {
      console.warn("DEV MODE: No Telegram InitData. Using mock user.");
      setUser({ id: 999, first_name: "Dev User", rating: 5.0, balance: 15000 });
      return;
    }

    fetch(`${BACKEND_URL}/api/validate_user`, {
      method: 'POST',
      headers: { 'X-Telegram-Init-Data': initDataRaw },
    })
      .then(response => response.ok ? response.json() : response.json().then(err => { throw new Error(err.detail) }))
      .then(data => setUser({ ...data, balance: parseFloat(data.balance) }))
      .catch(err => setError(err.message));
  }, [initDataRaw]);

  // --- Рендер ---
  if (error) return <div className="error-card">Ошибка: {error}</div>;
  if (!user && initDataRaw) return <div className="loading">Верификация...</div>;
  if (!user) return <div className="loading">Загрузка...</div>

  return (
    <div className="app-container">
      <main className="page-container">
        {activeTab === 'catalog' && <CatalogView />}
        {activeTab === 'sell' && <SellFlowView initDataRaw={initDataRaw} onFlowComplete={() => setActiveTab('catalog')} />}
        {activeTab === 'profile' && <ProfileView user={user} />}
      </main>
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

// --- КОМПОНЕНТЫ ВКЛАДОК (ЭКРАНЫ) ---

// 1. Вкладка "Каталог"
function CatalogView() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  // ... (логика покупки, загрузки, ошибок как и раньше)
  // Для простоты оставим ее без изменений, фокус на навигации и продаже

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/tickets/`)
      .then(res => res.json())
      .then(data => setTickets(data.map((t: any) => ({...t, price: parseFloat(t.price)}))))
      .catch(err => console.error("Failed to fetch tickets", err));
  }, []);
  
  const availableTickets = tickets.filter(t => t.status === 'available');

  return (
    <div>
      <h1 className="page-title">События</h1>
      <div className="search-bar-wrapper">
        <div className="icon"><SearchIcon /></div>
        <input type="text" className="search-bar" placeholder="Поиск по событиям..." />
      </div>
      <div className="ticket-list">
        {availableTickets.length > 0 ? availableTickets.map(ticket => (
          <div key={ticket.id} className="ticket-card">
            <h3>{ticket.event_name}</h3>
            <p>{new Date(ticket.event_date).toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })}</p>
            <div className="ticket-card-footer">
              <span className="price">{ticket.price.toFixed(2)} ₽</span>
              <button className="buy-btn">Купить</button>
            </div>
          </div>
        )) : <div className="info-card">В продаже пока нет билетов.</div>}
      </div>
    </div>
  );
}

// 2. Вкладка "Продать" (Многошаговый процесс)
function SellFlowView({ initDataRaw, onFlowComplete }: { initDataRaw: string | undefined, onFlowComplete: () => void }) {
  const [step, setStep] = useState(1); // 1: Поиск, 2: Детали
  const [selectedEvent, setSelectedEvent] = useState<EventInfo | null>(null);

  const handleEventSelect = (event: EventInfo) => {
    setSelectedEvent(event);
    setStep(2);
  };
  
  const handleBack = () => {
    setSelectedEvent(null);
    setStep(1);
  };

  if (step === 1) {
    return <EventSearchView onEventSelect={handleEventSelect} />;
  }
  
  if (step === 2 && selectedEvent) {
    return <AddTicketView event={selectedEvent} onBack={handleBack} initDataRaw={initDataRaw} onTicketAdded={onFlowComplete} />;
  }

  return null; // На случай непредвиденных обстоятельств
}

// 2.1. Шаг 1: Поиск события
function EventSearchView({ onEventSelect }: { onEventSelect: (event: EventInfo) => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<EventInfo[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        const handler = setTimeout(() => {
            setLoading(true);
            fetch(`${BACKEND_URL}/api/events/search?q=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(data => setResults(data))
                .catch(console.error)
                .finally(() => setLoading(false));
        }, 500); // Debounce для снижения нагрузки на API

        return () => clearTimeout(handler);
    }, [query]);

    return (
        <div>
            <h1 className="page-title">Продать билет</h1>
            <p className="hint" style={{marginTop: '-16px', marginBottom: '16px'}}>Найдите мероприятие, на которое вы хотите продать билет.</p>
            <div className="search-bar-wrapper">
                <div className="icon"><SearchIcon /></div>
                <input
                    type="text"
                    className="search-bar"
                    placeholder="Название, город или площадка..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
            </div>
            {loading && <div className="loading">Поиск...</div>}
            <ul className="event-search-results">
                {results.map((event, index) => (
                    <li key={index} onClick={() => onEventSelect(event)}>
                        <h4>{event.event_name}</h4>
                        <p>{event.venue}, {event.city} - {new Date(event.event_date).toLocaleDateString('ru-RU')}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}


// 2.2. Шаг 2: Форма добавления билета (модифицированная)
function AddTicketView({ event, onBack, onTicketAdded, initDataRaw }: { event: EventInfo, onBack: () => void, onTicketAdded: () => void, initDataRaw: string | undefined }) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!initDataRaw) {
        setFormError("Ошибка аутентификации. Перезапустите приложение.");
        return;
    }
    setSubmitting(true);
    setFormError('');

    const formData = new FormData(e.currentTarget);
    // Добавляем данные о событии, которые теперь не в форме
    formData.append('event_name', event.event_name);
    formData.append('event_date', event.event_date);
    formData.append('city', event.city);
    formData.append('venue', event.venue);

    try {
        const response = await fetch(`${BACKEND_URL}/api/tickets/`, {
            method: 'POST',
            headers: { 'X-Telegram-Init-Data': initDataRaw },
            body: formData,
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Ошибка создания билета');
        }
        alert('Билет успешно выставлен на продажу!');
        onTicketAdded();
    } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
        setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="sell-flow-header">
        <button onClick={onBack}><ArrowLeftIcon /></button>
        <h2>Детали билета</h2>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="input-imitation">{event.event_name}</div>
        <div className="input-imitation">{new Date(event.event_date).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <input name="price" type="number" step="0.01" placeholder="Цена в рублях" required />
        <input name="sector" placeholder="Сектор (необязательно)" />
        <input name="row" placeholder="Ряд (необязательно)" />
        <input name="seat" placeholder="Место (необязательно)" />
        <label htmlFor="ticket_file_input">Файл билета (PDF, JPG, PNG):</label>
        <input id="ticket_file_input" name="ticket_file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Отправка...' : 'Выставить на продажу'}
        </button>
        {formError && <p className="error-text">{formError}</p>}
      </form>
    </div>
  );
}

// 3. Вкладка "Профиль"
function ProfileView({ user }: { user: User }) {
  return (
    <div>
      <h1 className="page-title">Профиль</h1>
      <div className="user-card">
        <p><strong>Имя</strong> <span>{user.first_name}</span></p>
        <p><strong>Баланс</strong> <span>{user.balance.toFixed(2)} ₽</span></p>
        <p><strong>Рейтинг</strong> <span>{user.rating.toFixed(1)} / 5.0</span></p>
      </div>
      {/* Здесь можно добавить кнопки "История покупок", "Вывод средств" и т.д. */}
      <button className="logout-btn">Выйти (демо)</button>
    </div>
  );
}


// --- НАВИГАЦИОННЫЙ КОМПОНЕНТ ---
function TabBar({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (tab: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: JSX.Element }[] = [
    { id: 'catalog', label: 'События', icon: <HomeIcon /> },
    { id: 'sell', label: 'Продать', icon: <PlusSquareIcon /> },
    { id: 'profile', label: 'Профиль', icon: <UserIcon /> },
  ];

  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export default App;
