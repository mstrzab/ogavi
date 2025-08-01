// viago/frontend/src/App.tsx - v8.0 Active Search & Create Event Flow
import React, { useState, useEffect, useMemo } from 'react';
import { useRawInitData, hapticFeedback, showPopup } from '@telegram-apps/sdk-react';
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
  if (!user) return null;

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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTickets = () => {
    fetch(`${BACKEND_URL}/api/tickets/`)
      .then(res => res.json())
      .then(data => setTickets(data.map((t: any) => ({...t, price: parseFloat(t.price)}))))
      .catch(console.error);
  };
  useEffect(fetchTickets, []);
  
  const filteredTickets = useMemo(() => {
    const available = tickets.filter(t => t.status === 'available');
    if (!searchQuery) {
        return available;
    }
    return available.filter(ticket => 
        ticket.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.venue.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tickets, searchQuery]);

  const handleBuy = async (ticket: Ticket) => {
    try {
        const buttonId = await showPopup({
            title: 'Подтверждение',
            message: `Купить билет на "${ticket.event_name}" за ${ticket.price.toFixed(0)} ₽?`,
            buttons: [ { id: 'buy', type: 'default', text: 'Купить' }, { type: 'cancel' } ],
        });
        
        if (buttonId === 'buy') {
            hapticFeedback.impactOccurred('medium');
            const response = await fetch(`${BACKEND_URL}/api/tickets/${ticket.id}/buy`, {
                method: 'POST', headers: { 'X-Telegram-Init-Data': initDataRaw || '' },
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Не удалось купить билет');
            }
            showPopup({ title: 'Успешно!', message: 'Билет добавлен в ваш профиль.' });
            onPurchase();
            fetchTickets();
        }
    } catch (err) {
        if (err instanceof Error) {
            hapticFeedback.notificationOccurred('error');
            showPopup({ title: 'Ошибка', message: err.message });
        }
    }
  };

  return (
    <>
      <h1 className="large-title">События</h1>
      <div className="search-bar">
        <SearchIcon />
        <input 
            type="text" 
            placeholder="Поиск по названию или месту" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="list-container">
        {filteredTickets.length > 0 ? filteredTickets.map(ticket => (
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
            <h4>{searchQuery ? 'Ничего не найдено' : 'Нет билетов в продаже'}</h4>
            <p>{searchQuery ? 'Попробуйте изменить запрос' : 'Загляните позже'}</p>
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
        if (!initDataRaw) return;
        fetch(`${BACKEND_URL}/api/users/me/tickets/purchased`, { headers: { 'X-Telegram-Init-Data': initDataRaw }})
            .then(res => res.json()).then(setTickets).catch(console.error);
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
        if (!initDataRaw) return;
        fetch(`${BACKEND_URL}/api/users/me/tickets/selling`, { headers: { 'X-Telegram-Init-Data': initDataRaw }})
            .then(res => res.json()).then(setTickets).catch(console.error);
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

  const proceedToAddDetails = (event: EventInfo) => {
    setSelectedEvent(event);
    setStep(2);
  };
  const proceedToCreateEvent = () => setStep(3);
  const handleBackToSearch = () => {
    setStep(1);
    setSelectedEvent(null);
  };

  switch (step) {
    case 1:
      return <EventSearchView onEventSelect={proceedToAddDetails} onCreateNew={proceedToCreateEvent} />;
    case 2:
      return <AddTicketView event={selectedEvent!} onBack={handleBackToSearch} onTicketAdded={onFlowComplete} initDataRaw={initDataRaw} />;
    case 3:
      return <CreateEventView onBack={handleBackToSearch} onEventCreated={proceedToAddDetails} />;
    default:
      return null;
  }
}

function EventSearchView({ onEventSelect, onCreateNew }: { onEventSelect: (event: EventInfo) => void, onCreateNew: () => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<EventInfo[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]); return;
        }
        const handler = setTimeout(() => {
            setLoading(true);
            fetch(`${BACKEND_URL}/api/events/search?q=${encodeURIComponent(query)}`)
                .then(res => res.json()).then(setResults)
                .catch(console.error).finally(() => setLoading(false));
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
                {results.map((event, index) => (
                    <div key={index} className="list-card" onClick={() => onEventSelect(event)} style={{cursor: 'pointer'}}>
                        <h3>{event.event_name}</h3>
                        <p className="subtitle">{event.venue}, {event.city}</p>
                    </div>
                ))}
                {!loading && query.length > 0 && (
                    <button onClick={onCreateNew} className="link-button">
                        Не нашли свое событие? Создать новое
                    </button>
                )}
            </div>
        </>
    );
}

function CreateEventView({ onBack, onEventCreated }: { onBack: () => void, onEventCreated: (event: EventInfo) => void }) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newEvent: EventInfo = {
            event_name: formData.get('event_name') as string,
            event_date: formData.get('event_date') as string,
            city: formData.get('city') as string,
            venue: formData.get('venue') as string,
        };
        if (!newEvent.event_name || !newEvent.event_date || !newEvent.city || !newEvent.venue) {
            showPopup({ title: "Ошибка", message: "Пожалуйста, заполните все поля." });
            return;
        }
        onEventCreated(newEvent);
    };

    return (
        <>
            <div style={{display: 'flex', alignItems: 'center', margin: '16px 0'}}>
                <button onClick={onBack} style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0}}><ArrowLeftIcon /></button>
                <h1 className="large-title" style={{margin: '0 auto', paddingRight: '24px' }}>Новое событие</h1>
            </div>
            <form onSubmit={handleSubmit} className="form-container">
                <input name="event_name" placeholder="Название мероприятия" required />
                <input name="event_date" type="date" placeholder="Дата" required />
                <input name="city" placeholder="Город" required />
                <input name="venue" placeholder="Место проведения" required />
                <button type="submit" className="apple-button">Продолжить</button>
            </form>
        </>
    );
}

function AddTicketView({ event, onBack, onTicketAdded, initDataRaw }: { event: EventInfo; onBack: () => void; onTicketAdded: () => void; initDataRaw: string | undefined }) {
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!initDataRaw) {
            setFormError("Ошибка аутентификации. Перезапустите приложение."); return;
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
                method: 'POST', headers: { 'X-Telegram-Init-Data': initDataRaw }, body: formData,
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Ошибка создания билета');
            }
            showPopup({ message: 'Билет успешно выставлен на продажу!' });
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
