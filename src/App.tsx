// viago/frontend/src/App.tsx - v7.1 (Correct SDK Usage)
import React, { useState, useEffect } from 'react';
import { useRawInitData, useWebApp } from '@telegram-apps/sdk-react';
import {
    HomeIcon, HomeIconFilled,
    PlusSquareIcon, PlusSquareIconFilled,
    UserIcon, UserIconFilled,
    SearchIcon, ArrowLeftIcon
} from './Icons';
import './App.css';

// --- Типы и Константы ---
const BACKEND_URL = "https://api.goviago.ru";
type Tab = 'catalog' | 'sell' | 'profile';
type ProfileSegment = 'myTickets' | 'forSale';

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
  venue: string;
  price: number;
  status: 'available' | 'sold' | 'archived';
  sector?: string;
  row?: string;
  seat?: string;
}
interface EventInfo {
  event_name: string;
  event_date: string;
  city: string;
  venue: string;
}

// --- Основной компонент App ---
function App() {
  const initDataRaw = useRawInitData();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('catalog');

  const fetchUser = () => {
    if (!initDataRaw) {
      console.warn("DEV MODE: No Telegram InitData. Using mock user.");
      setUser({ id: 999, first_name: "Dev User", rating: 5.0, balance: 15000 });
      return;
    }
    fetch(`${BACKEND_URL}/api/validate_user`, {
      method: 'POST',
      headers: { 'X-Telegram-Init-Data': initDataRaw },
    })
      .then(response => {
        if (!response.ok) return response.json().then(err => { throw new Error(err.detail || 'Server error') });
        return response.json();
      })
      .then(data => setUser({ ...data, balance: parseFloat(data.balance) }))
      .catch(err => setError(err.message));
  };

  useEffect(fetchUser, [initDataRaw]);

  if (error) return <div className="info-card" style={{margin: 16}}>{error}</div>;
  if (!user) return null; // Or a full-page loader

  return (
    <div className="app-container">
      <main className="page-container">
        {activeTab === 'catalog' && <CatalogView onPurchase={fetchUser} />}
        {activeTab === 'sell' && <SellFlowView initDataRaw={initDataRaw} onFlowComplete={() => setActiveTab('catalog')} />}
        {activeTab === 'profile' && <ProfileView user={user} />}
      </main>
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

// --- Компоненты Экранов ---

function CatalogView({ onPurchase }: { onPurchase: () => void }) {
  const initDataRaw = useRawInitData();
  // --- FIX IS HERE: Using the main webApp hook ---
  const webApp = useWebApp();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const fetchTickets = () => {
    fetch(`${BACKEND_URL}/api/tickets/`)
      .then(res => res.json())
      .then(data => setTickets(data.map((t: any) => ({...t, price: parseFloat(t.price)}))))
      .catch(console.error);
  };
  useEffect(fetchTickets, []);

  const handleBuy = async (ticket: Ticket) => {
    try {
      // --- Using webApp.showPopup ---
      const buttonId = await webApp.showPopup({
          title: 'Подтверждение',
          message: `Купить билет на "${ticket.event_name}" за ${ticket.price.toFixed(0)} ₽?`,
          buttons: [{ id: 'buy', type: 'default', text: 'Купить' }, { type: 'cancel' }]
      });

      if (buttonId === 'buy') {
          // --- Using webApp.HapticFeedback ---
          webApp.HapticFeedback.impactOccurred('medium');
          const response = await fetch(`${BACKEND_URL}/api/tickets/${ticket.id}/buy`, {
              method: 'POST',
              headers: { 'X-Telegram-Init-Data': initDataRaw || '' },
          });
          if (!response.ok) {
              const err = await response.json();
              throw new Error(err.detail || 'Не удалось купить билет');
          }
          webApp.showPopup({ title: 'Успешно!', message: 'Билет добавлен в ваш профиль.' });
          onPurchase();
          fetchTickets();
      }
    } catch (err) {
        // The showPopup promise rejects if the popup is closed
        if (err instanceof Error) {
            webApp.HapticFeedback.notificationOccurred('error');
            webApp.showPopup({ title: 'Ошибка', message: err.message });
        }
        console.error(err);
    }
  };

  const availableTickets = tickets.filter(t => t.status === 'available');

  return (
    <>
      <h1 className="large-title">События</h1>
      <div className="search-bar">
        <SearchIcon />
        <input type="text" placeholder="Поиск" />
      </div>
      <div className="list-container">
        {availableTickets.length > 0 ? availableTickets.map(ticket => (
          <div key={ticket.id} className="list-card">
            <h3>{ticket.event_name}</h3>
            <p className="subtitle">{new Date(ticket.event_date).toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })} • {ticket.venue}</p>
            <div className="footer">
              <span className="price">{ticket.price.toFixed(0)} ₽</span>
              <button onClick={() => handleBuy(ticket)} className="apple-button" style={{width: 'auto', padding: '8px 16px', fontSize: '15px'}}>Купить</button>
            </div>
          </div>
        )) : (
          <div className="info-card">
            <h4>Нет билетов в продаже</h4>
            <p>Загляните позже</p>
          </div>
        )}
      </div>
    </>
  );
}

function ProfileView({ user }: { user: User }) {
  const [segment, setSegment] = useState<ProfileSegment>('myTickets');
  return (
    <>
      <h1 className="large-title">Профиль</h1>
      <div className="list-card profile-list">
        <div className="profile-row">
            <span>Имя</span>
            <span>{user.first_name}</span>
        </div>
        <div className="profile-row">
            <span>Баланс</span>
            <span>{user.balance.toFixed(2)} ₽</span>
        </div>
      </div>

      <div className="segmented-control">
        <button onClick={() => setSegment('myTickets')} className={segment === 'myTickets' ? 'active' : ''}>Мои билеты</button>
        <button onClick={() => setSegment('forSale')} className={segment === 'forSale' ? 'active' : ''}>На продаже</button>
      </div>

      {segment === 'myTickets' && <MyTicketsList />}
      {segment === 'forSale' && <SellingTicketsList />}
    </>
  );
}

function MyTicketsList() {
    const initDataRaw = useRawInitData();
    const [tickets, setTickets] = useState<Ticket[]>([]);

    useEffect(() => {
        fetch(`${BACKEND_URL}/api/users/me/tickets/purchased`, { headers: { 'X-Telegram-Init-Data': initDataRaw || '' }})
            .then(res => res.json())
            .then(data => setTickets(data))
            .catch(console.error);
    }, [initDataRaw]);

    if (tickets.length === 0) return <div className="info-card">У вас пока нет купленных билетов.</div>;

    return (
        <div className="list-container">
            {tickets.map(ticket => (
                <div key={ticket.id} className="list-card">
                    <h3>{ticket.event_name}</h3>
                    <p className="subtitle">{new Date(ticket.event_date).toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })} • {ticket.venue}</p>
                </div>
            ))}
        </div>
    );
}

function SellingTicketsList() {
    const initDataRaw = useRawInitData();
    const [tickets, setTickets] = useState<Ticket[]>([]);

    useEffect(() => {
        fetch(`${BACKEND_URL}/api/users/me/tickets/selling`, { headers: { 'X-Telegram-Init-Data': initDataRaw || '' }})
            .then(res => res.json())
            .then(data => setTickets(data))
            .catch(console.error);
    }, [initDataRaw]);

    if (tickets.length === 0) return <div className="info-card">У вас нет билетов на продаже.</div>;

    return (
        <div className="list-container">
            {tickets.map(ticket => (
                <div key={ticket.id} className="list-card">
                    <h3>{ticket.event_name}</h3>
                    <p className="subtitle">Цена: {ticket.price.toFixed(0)} ₽</p>
                </div>
            ))}
        </div>
    );
}


function SellFlowView({ initDataRaw, onFlowComplete }: { initDataRaw: string | undefined, onFlowComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<EventInfo | null>(null);

  const handleEventSelect = (event: EventInfo) => {
    setSelectedEvent(event);
    setStep(2);
  };
  const handleBack = () => {
    setStep(1);
    setSelectedEvent(null);
  };
  const handleComplete = () => {
    onFlowComplete();
  };

  if (step === 1) {
    return <EventSearchView onEventSelect={handleEventSelect} />;
  }

  if (step === 2 && selectedEvent) {
    return <AddTicketView event={selectedEvent} onBack={handleBack} onTicketAdded={handleComplete} initDataRaw={initDataRaw} />;
  }

  return null;
}

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
        }, 500);
        return () => clearTimeout(handler);
    }, [query]);

    return (
        <>
            <h1 className="large-title">Продать билет</h1>
            <div className="search-bar">
                <SearchIcon />
                <input type="text" placeholder="Найдите ваше событие" value={query} onChange={e => setQuery(e.target.value)} autoFocus />
            </div>
            <div className="list-container">
                {loading && <p style={{textAlign: 'center', color: 'var(--ios-label-secondary)'}}>Поиск...</p>}
                {!loading && query.length > 1 && results.length === 0 && <p style={{textAlign: 'center', color: 'var(--ios-label-secondary)'}}>Ничего не найдено</p>}
                {results.map((event, index) => (
                    <div key={index} className="list-card" onClick={() => onEventSelect(event)} style={{cursor: 'pointer'}}>
                        <h3>{event.event_name}</h3>
                        <p className="subtitle">{event.venue}, {event.city}</p>
                    </div>
                ))}
            </div>
        </>
    );
}

function AddTicketView({ event, onBack, onTicketAdded, initDataRaw }: { event: EventInfo; onBack: () => void; onTicketAdded: () => void; initDataRaw: string | undefined }) {
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
        <>
            <div style={{display: 'flex', alignItems: 'center', margin: '16px 0'}}>
                <button onClick={onBack} style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0}}><ArrowLeftIcon /></button>
                <h1 className="large-title" style={{margin: '0 auto', paddingRight: '24px' }}>Детали</h1>
            </div>
            <form onSubmit={handleSubmit} className="form-container">
                <input type="number" step="0.01" name="price" placeholder="Цена в рублях" required />
                <input type="text" name="sector" placeholder="Сектор (необязательно)" />
                <input type="text" name="row" placeholder="Ряд (необязательно)" />
                <input type="text" name="seat" placeholder="Место (необязательно)" />
                <input type="file" name="ticket_file" required />
                <button type="submit" className="apple-button" disabled={submitting}>
                    {submitting ? 'Публикация...' : 'Выставить на продажу'}
                </button>
                {formError && <p className="error-text">{formError}</p>}
            </form>
        </>
    );
}

function TabBar({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (tab: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: JSX.Element; activeIcon: JSX.Element }[] = [
    { id: 'catalog', label: 'События', icon: <HomeIcon />, activeIcon: <HomeIconFilled /> },
    { id: 'sell', label: 'Продать', icon: <PlusSquareIcon />, activeIcon: <PlusSquareIconFilled /> },
    { id: 'profile', label: 'Профиль', icon: <UserIcon />, activeIcon: <UserIconFilled /> },
  ];

  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <button key={tab.id} className={`tab-button ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
          {activeTab === tab.id ? tab.activeIcon : tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export default App;
