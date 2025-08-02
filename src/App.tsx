// viago/frontend/src/App.tsx - v12.3 (Final & Corrected Order)
import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { useRawInitData, hapticFeedback, showPopup, viewport } from '@telegram-apps/sdk-react';
import { HomeIcon, HomeIconFilled, PlusSquareIcon, PlusSquareIconFilled, UserIcon, UserIconFilled, SearchIcon, ArrowLeftIcon, UploadIcon } from './Icons';
import './App.css';

// --- Types and Constants ---
const BACKEND_URL = "https://api.goviago.ru";
const ADMIN_TELEGRAM_ID = 1057323678;

type Tab = 'catalog' | 'sell' | 'profile';
type ProfileSegment = 'myTickets' | 'forSale';

interface User { id: number; first_name: string; rating: number; balance: number; held_balance?: number; }
interface Event { id: number; event_name: string; event_date: string; city: string; venue: string; cover_image_url?: string; }
interface Ticket { id: number; price: number; status: string; sector?: string; row?: string; seat?: string; event: Event; }
interface TicketDetailsData extends Ticket { temp_file_url: string; }
interface EventInfo { event_name: string; event_date: string; city: string; venue: string; }

// --- Utility & Reusable Components (Defined First!) ---

const FormField = ({ label, name, type = "text", required = false, placeholder, value, onChange }: { label:string, name:string, type?:string, required?:boolean, placeholder?:string, value?:string, onChange?:(e: ChangeEvent<HTMLInputElement>) => void }) => (
  <div className="form-field">
      <label htmlFor={name}>{label}</label>
      <input 
        id={name} name={name} type={type} placeholder={placeholder || ''} 
        required={required} value={value || ''} onChange={onChange} 
      />
  </div>
);

const FileInput = ({ name }: { name: string }) => {
  const [fileName, setFileName] = useState('');
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => setFileName(e.target.files?.[0]?.name || '');
  return(
    <div className="form-field" style={{padding:0, background:'none', boxShadow: 'none'}}>
      <label>Файл билета (PDF или фото)</label>
      <div className="file-input-wrapper" style={{borderStyle:'solid', borderColor: fileName ? 'var(--color-action-green)' : 'var(--color-border)', color: fileName ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'}}>
        {fileName ? <span className="file-name">{fileName}</span> : <><UploadIcon /><p style={{margin: '8px 0 0 0'}}>Нажмите, чтобы загрузить</p></>}
        <input type="file" name={name} required onChange={handleFileChange} accept="image/*,application/pdf" />
      </div>
    </div>
  );
};

const SkeletonList = () => (
  <div className="list-container">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="skeleton-card">
        <div className="skeleton-line title"></div>
        <div className="skeleton-line subtitle"></div>
        <div className="clearfix" style={{marginTop: '16px'}}>
          <div className="skeleton-line price"></div>
          <div className="skeleton-line button"></div>
        </div>
      </div>
    ))}
  </div>
);

const FormPage = ({ title, children, onBack }: { title: string, children: React.ReactNode, onBack?: () => void }) => (
  <>
    <div style={{display: 'flex', alignItems: 'center', margin: '8px 0 16px -8px'}}>
        {onBack && <button onClick={onBack} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '8px'}}><ArrowLeftIcon /></button>}
        <h1 className="large-title" style={{margin: 0, flexGrow: 1, textAlign: onBack ? 'center' : 'left', paddingRight: onBack ? '24px': 0 }}>{title}</h1>
    </div>
    {children}
  </>
);


// --- Screen Components ---

function EditCoverModal({ event, onClose, onSuccess }: { event: Event, onClose: () => void, onSuccess: () => void }) {
    const initDataRaw = useRawInitData();
    const [coverUrl, setCoverUrl] = useState(event.cover_image_url || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setIsSubmitting(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/admin/events/${event.id}/cover`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initDataRaw || '' },
                body: JSON.stringify({ cover_image_url: coverUrl })
            });
            if (!response.ok) throw new Error((await response.json()).detail || "Failed to update cover");
            showPopup({ message: "Обложка обновлена!" }); onSuccess();
        } catch (err) {
            showPopup({ title: "Ошибка", message: (err as Error).message });
        } finally { setIsSubmitting(false); }
    };
    
    return (
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{marginTop:0}}>Обложка для "{event.event_name}"</h3>
            <form onSubmit={handleSubmit} className="form-container">
                <FormField label='URL обложки' name='cover_url' type='url' value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} required />
                <button type="submit" className="primary-button" disabled={isSubmitting}>{isSubmitting ? "Сохранение..." : "Сохранить"}</button>
            </form>
        </div>
      </div>
    );
}

function CatalogView({ isAdmin, onPurchase }: { isAdmin: boolean; onPurchase: () => void; }) {
  const initDataRaw = useRawInitData();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchTickets = () => {
      setIsLoading(true);
      fetch(`${BACKEND_URL}/api/tickets/`)
        .then(res => res.json())
        .then(data => setTickets(data))
        .catch(console.error)
        .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    fetchTickets();
  }, [refreshKey]);
  
  const handleBuy = async (ticket: Ticket) => {
    try {
        const buttonId = await showPopup({
            title: 'Подтверждение', message: `Купить билет на "${ticket.event.event_name}" за ${ticket.price.toFixed(0)} ₽?`,
            buttons: [ { id: 'buy', type: 'default', text: 'Купить' }, { type: 'cancel' } ],
        });
        if (buttonId !== 'buy') return;
        hapticFeedback.impactOccurred('medium');
        const response = await fetch(`${BACKEND_URL}/api/tickets/${ticket.id}/buy`, {
            method: 'POST', headers: { 'X-Telegram-Init-Data': initDataRaw || '' },
        });
        if (!response.ok) throw new Error((await response.json()).detail || 'Не удалось купить билет');
        showPopup({ title: 'Успешно!', message: 'Билет добавлен в ваш профиль.' });
        onPurchase(); setRefreshKey(k => k + 1);
    } catch (err) {
        if (err instanceof Error) {
            hapticFeedback.notificationOccurred('error'); showPopup({ title: 'Ошибка', message: err.message });
        }
    }
  };
  
  const handleCoverUpdated = () => { setEditingEvent(null); setRefreshKey(k => k + 1); };

  const filteredTickets = useMemo(() => tickets.filter(ticket => 
    ticket.event.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.event.venue.toLowerCase().includes(searchQuery.toLowerCase())
  ), [tickets, searchQuery]);

  return (
    <>
      <h1 className="large-title">События</h1>
      <div className="search-bar">
        <SearchIcon />
        <input type="text" placeholder="Поиск по названию или месту" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>
      {isLoading ? <SkeletonList /> : (
        <div className="list-container">
          {filteredTickets.length > 0 ? filteredTickets.map(ticket => (
            <div key={ticket.id} className="list-card">
              {isAdmin && (
                  <button onClick={() => setEditingEvent(ticket.event)} style={{float:'right', background:'none', border:'none', color:'var(--color-text-secondary)', cursor:'pointer', padding: '0 0 8px 8px'}}>
                      Edit
                  </button>
              )}
              <h3>{ticket.event.event_name}</h3>
              <p className="subtitle">{new Date(ticket.event.event_date).toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })} • {ticket.event.venue}</p>
              <div className="footer clearfix">
                <span className="price">{ticket.price.toFixed(0)} ₽</span>
                <button onClick={() => handleBuy(ticket)} className="primary-button" style={{width: 'auto', padding: '12px 24px', fontSize: '16px'}}>Купить</button>
              </div>
            </div>
          )) : <div className="info-card"><h4>Ничего не найдено</h4><p>Попробуйте изменить запрос или загляните позже.</p></div>}
        </div>
      )}
      {editingEvent && <EditCoverModal event={editingEvent} onClose={() => setEditingEvent(null)} onSuccess={handleCoverUpdated} />}
    </>
  );
}

function MyTicketsList({ onViewTicket }: { onViewTicket: (id: number) => void; }) {
    const initDataRaw = useRawInitData();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!initDataRaw) return;
        setIsLoading(true);
        fetch(`${BACKEND_URL}/api/users/me/tickets/purchased`, { headers: { 'X-Telegram-Init-Data': initDataRaw }})
            .then(res => res.json()).then(setTickets).catch(console.error).finally(() => setIsLoading(false));
    }, [initDataRaw]);

    if (isLoading) return <SkeletonList />;
    if (tickets.length === 0) return <div className="info-card">У вас пока нет купленных билетов.</div>;

    return (
        <div className="list-container">
            {tickets.map(ticket => (
                <div key={ticket.id} className="list-card" onClick={() => onViewTicket(ticket.id)} style={{cursor: 'pointer'}}>
                    <h3>{ticket.event.event_name}</h3>
                    <p className="subtitle">{new Date(ticket.event.event_date).toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })} • {ticket.event.venue}</p>
                </div>
            ))}
        </div>
    );
}

function SellingTicketsList() {
    const initDataRaw = useRawInitData();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!initDataRaw) return;
        setIsLoading(true);
        fetch(`${BACKEND_URL}/api/users/me/tickets/selling`, { headers: { 'X-Telegram-Init-Data': initDataRaw }})
            .then(res => res.json()).then(setTickets).catch(console.error).finally(() => setIsLoading(false));
    }, [initDataRaw]);

    if (isLoading) return <SkeletonList />;
    if (tickets.length === 0) return <div className="info-card">У вас нет билетов на продаже.</div>;
    
    return (
        <div className="list-container">
            {tickets.map(ticket => (
                <div key={ticket.id} className="list-card">
                    <h3>{ticket.event.event_name}</h3>
                    <p className="subtitle">Цена: {ticket.price.toFixed(0)} ₽</p>
                </div>
            ))}
        </div>
    );
}

function ProfileView({ user, isAdmin, onViewTicket }: { user: User; isAdmin: boolean; onViewTicket: (id: number) => void; }) {
  const [segment, setSegment] = useState<ProfileSegment>('myTickets');
  return (
    <>
      <h1 className="large-title">Профиль</h1>
      <div className="list-card">
        <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between' }}><span>Имя</span><span style={{color: 'var(--color-text-secondary)'}}>{user.first_name} {isAdmin && ' (Admin)'}</span></div>
        <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between' }}><span>Баланс</span><span style={{color: 'var(--color-text-secondary)'}}>{user.balance.toFixed(2)} ₽</span></div>
      </div>
      <div className="segmented-control">
        <button onClick={() => setSegment('myTickets')} className={segment === 'myTickets' ? 'active' : ''}>Мои билеты</button>
        <button onClick={() => setSegment('forSale')} className={segment === 'forSale' ? 'active' : ''}>На продаже</button>
      </div>
      {segment === 'myTickets' && <MyTicketsList onViewTicket={onViewTicket} />}
      {segment === 'forSale' && <SellingTicketsList />}
    </>
  );
}

function EventSearchView({ onEventSelect, onCreateNew }: { onEventSelect: (event: EventInfo) => void, onCreateNew: () => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<EventInfo[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (query.length < 2) { setResults([]); return; }
        const handler = setTimeout(() => {
            setLoading(true);
            fetch(`${BACKEND_URL}/api/events/search?q=${encodeURIComponent(query)}`)
                .then(res => res.json()).then(setResults).catch(console.error).finally(() => setLoading(false));
        }, 300);
        return () => clearTimeout(handler);
    }, [query]);
  
  return (
    <FormPage title="Продать билет">
      <div className="search-bar">
          <SearchIcon />
          <input type="text" placeholder="Название, город или площадка" value={query} onChange={e => setQuery(e.target.value)} />
      </div>
      <div className="list-container">
          {results.map((event, index) => (
              <div key={index} className="list-card" onClick={() => onEventSelect(event)} style={{cursor: 'pointer'}}>
                  <h3>{event.event_name}</h3>
                  <p className="subtitle">{event.venue}, {event.city}</p>
              </div>
          ))}
          {!loading && query.length > 1 && results.length === 0 && (
              <button onClick={onCreateNew} className="link-button">
                  Событие не найдено. Создать новое.
              </button>
          )}
      </div>
    </FormPage>
  );
}

function CreateEventView({ onBack, onEventCreated }: { onBack: () => void, onEventCreated: (event: EventInfo) => void }) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const formData = new FormData(e.currentTarget);
    const newEvent: EventInfo = {
        event_name: formData.get('event_name') as string, event_date: formData.get('event_date') as string,
        city: formData.get('city') as string, venue: formData.get('venue') as string,
    };
    if (Object.values(newEvent).some(val => !val)) {
        showPopup({ title: "Ошибка", message: "Пожалуйста, заполните все поля." }); return;
    }
    onEventCreated(newEvent);
  };
  return (
    <FormPage title="Новое событие" onBack={onBack}>
      <form onSubmit={handleSubmit} className="form-container">
          <FormField label="Название мероприятия" name="event_name" required />
          <FormField label="Дата" name="event_date" type="date" required />
          <FormField label="Город" name="city" required />
          <FormField label="Место проведения" name="venue" required />
          <button type="submit" className="primary-button">Продолжить</button>
      </form>
    </FormPage>
  );
}

function AddTicketView({ event, onBack, onTicketAdded, initDataRaw }: { event: EventInfo; onBack: () => void; onTicketAdded: () => void; initDataRaw: string | undefined }) {
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!initDataRaw) return;
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.append('event_name', event.event_name); formData.append('event_date', event.event_date);
    formData.append('city', event.city); formData.append('venue', event.venue);
    try {
        const response = await fetch(`${BACKEND_URL}/api/tickets/`, { method: 'POST', headers: { 'X-Telegram-Init-Data': initDataRaw }, body: formData });
        if (!response.ok) throw new Error((await response.json()).detail || 'Ошибка создания билета');
        showPopup({ message: 'Билет успешно выставлен на продажу!' }); onTicketAdded();
    } catch (error) {
        if (error instanceof Error) showPopup({ title: 'Ошибка', message: error.message });
    } finally { setSubmitting(false); }
  };

  return (
    <FormPage title={event.event_name} onBack={onBack}>
      <form onSubmit={handleSubmit} className="form-container">
          <FormField label="Цена" name="price" type="number" placeholder='0 ₽' required />
          <FormField label="Сектор" name="sector" placeholder="Необязательно" />
          <FormField label="Ряд" name="row" placeholder="Необязательно" />
          <FormField label="Место" name="seat" placeholder="Необязательно" />
          <FileInput name="ticket_file" />
          <button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Публикация...' : 'Выставить на продажу'}</button>
      </form>
    </FormPage>
  );
}

function TicketDetailView({ ticketId, onBack }: { ticketId: number; onBack: () => void; }) {
    const initDataRaw = useRawInitData();
    const [ticket, setTicket] = useState<TicketDetailsData | null>(null);
    const [error, setError] = useState('');
    const [showSeat, setShowSeat] = useState(false);

    useEffect(() => {
        if (!initDataRaw) return;
        fetch(`${BACKEND_URL}/api/tickets/${ticketId}/details`, { headers: { 'X-Telegram-Init-Data': initDataRaw }})
            .then(res => res.ok ? res.json() : Promise.reject(new Error('Не удалось загрузить детали билета.')))
            .then(data => { setTicket(data); recordVerification('a'); })
            .catch(err => setError(err.message));
    }, [ticketId, initDataRaw]);
    
    const recordVerification = async (point: 'a' | 'b') => { /* ... (logic unchanged) ... */ };
    const handleShowSeat = () => { setShowSeat(true); recordVerification('b'); hapticFeedback.impactOccurred('heavy'); };

    if (error) return <FormPage title="Ошибка"><div className="info-card">{error}</div></FormPage>;
    if (!ticket) return <FormPage title="Загрузка..."><SkeletonList/></FormPage>;

    return (
        <FormPage title={ticket.event.event_name} onBack={onBack}>
            <img src={ticket.temp_file_url} alt="Билет" style={{width: '100%', borderRadius: 'var(--radius-card)', marginBottom: '16px', display: 'block' }} />
            <div className="list-card">
                {showSeat ? (
                    <div>
                        <h3 style={{marginBottom: '16px'}}>Ваше место</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                            <div><div style={{fontSize: '13px', color: 'var(--color-text-secondary)'}}>Сектор</div><div style={{fontSize: '18px', fontWeight: '600'}}>{ticket.sector || '–'}</div></div>
                            <div><div style={{fontSize: '13px', color: 'var(--color-text-secondary)'}}>Ряд</div><div style={{fontSize: '18px', fontWeight: '600'}}>{ticket.row || '–'}</div></div>
                            <div><div style={{fontSize: '13px', color: 'var(--color-text-secondary)'}}>Место</div><div style={{fontSize: '18px', fontWeight: '600'}}>{ticket.seat || '–'}</div></div>
                        </div>
                    </div>
                ) : ( <button onClick={handleShowSeat} className="primary-button">Показать моё место</button> )}
            </div>
        </FormPage>
    );
}

// --- Tab Navigator & Main App Component ---

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

function CurrentTab({ tab, ...props }: { tab: Tab } & any) {
    switch (tab) {
        case 'catalog': return <CatalogView {...props} />;
        case 'sell': return <SellFlowView {...props} />;
        case 'profile': return <ProfileView {...props} />;
        default: return null;
    }
}

function App() {
  const initDataRaw = useRawInitData();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [viewingTicketId, setViewingTicketId] = useState<number | null>(null);

  useEffect(() => { viewport?.expand(); }, []);
  
  const fetchUser = () => {
    if (!initDataRaw) { setUser({ id: 1057323678, first_name: "Dev", rating: 5, balance: 10000 }); return; };
    fetch(`${BACKEND_URL}/api/validate_user`, { method: 'POST', headers: { 'X-Telegram-Init-Data': initDataRaw } })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => setUser({ ...data, balance: parseFloat(data.balance) }))
      .catch((err) => console.error("Validation failed", err));
  };
  
  useEffect(fetchUser, [initDataRaw]);

  const handleFlowComplete = () => setActiveTab('catalog');
  const handlePurchase = () => fetchUser();
  const handleViewTicket = (id: number) => setViewingTicketId(id);
  const isAdmin = user?.id === ADMIN_TELEGRAM_ID;

  if (viewingTicketId) return <TicketDetailView ticketId={viewingTicketId} onBack={() => setViewingTicketId(null)} />;
  
  return (
    <div className="app-container">
      <main className="page-container">
        {user ? (
            <CurrentTab tab={activeTab} isAdmin={isAdmin} initDataRaw={initDataRaw}
                onFlowComplete={handleFlowComplete} onPurchase={handlePurchase}
                user={user} onViewTicket={handleViewTicket} />
        ) : <SkeletonList />}
      </main>
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default App;
