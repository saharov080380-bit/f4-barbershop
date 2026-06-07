import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";  // нужен чтобы рендерить модалку поверх всего
import "./App.css";

// базовый путь к бэкенду — nginx проксирует /api/ на Django
const API = "/api";

// список услуг с ценами и длительностью — используется в модалке записи и карточках
const SERVICES = [
  { id: "Стрижка",          icon: "✂️",  price: 800,  duration: "45 мин" },
  { id: "Оформление бороды", icon: "🧔",  price: 500,  duration: "30 мин" },
  { id: "Стрижка + борода", icon: "💈",  price: 1200, duration: "75 мин" },
  { id: "Бритьё",           icon: "🪒",  price: 600,  duration: "40 мин" },
  { id: "Тонирование",      icon: "🎨",  price: 700,  duration: "50 мин" },
  { id: "Укладка",          icon: "💆",  price: 400,  duration: "20 мин" },
];

// временные слоты — барбершоп работает с 9 до 19, каждый час
const TIME_SLOTS = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];

// Специализации мастеров — присваиваются по остатку от деления на длину списка
// специализации мастеров — назначаются по порядковому номеру стола
const SPECS = [
  ["Классические стрижки", "Оформление бороды"],
  ["Фейды и скины",        "Стайлинг и укладка"],
  ["Тонирование волос",    "Горячее бритьё"],
  ["Детские стрижки",      "Контурная окантовка"],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// хелперы для работы с localStorage — токен и данные пользователя живут там после входа
const getToken    = () => localStorage.getItem("token");
const getUsername = () => localStorage.getItem("username");
const getRole     = () => localStorage.getItem("role");

// универсальная функция для запросов к API — сама подставляет токен в заголовок
async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res  = await fetch(API + path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Ошибка запроса");
  return data;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

// склонение числительных по-русски: 1 мастер, 2 мастера, 5 мастеров
function plur(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m100 >= 11 && m100 <= 19) return `${n} ${many}`;
  if (m10 === 1) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

function fmt(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

function isShopOpen() {
  const h = new Date().getHours();
  return h >= 9 && h < 19;
}

function bookingStatus(date) {
  const t = todayStr();
  if (date === t) return "today";
  if (date > t)  return "upcoming";
  return "past";
}

function statusLabel(s) {
  if (s === "today")    return "Сегодня";
  if (s === "upcoming") return "Предстоит";
  return "Прошло";
}

// ─── Toast ────────────────────────────────────────────────────────────────────

// хук для всплывающих уведомлений — автоматически скрываются через 3.2 секунды
function useToast() {
  const [list, setList] = useState([]);
  const add = useCallback((msg, type = "ok") => {
    const id = Date.now();
    setList(p => [...p, { id, msg, type }]);
    setTimeout(() => setList(p => p.filter(t => t.id !== id)), 3200);
  }, []);
  return { list, add };
}

function Toasts({ list }) {
  return (
    <div className="toasts">
      {list.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-ic">{t.type === "ok" ? "✓" : "✕"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function AuthPage({ onLogin }) {
  const [mode, setMode]         = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      if (mode === "register") {
        await apiFetch("/register", { method: "POST", body: JSON.stringify({ username, password }) });
        setSuccess("Аккаунт создан — войдите!");
        setMode("login"); setPassword("");
      } else {
        const d = await apiFetch("/login", { method: "POST", body: JSON.stringify({ username, password }) });
        localStorage.setItem("token",    d.token);
        localStorage.setItem("role",     d.role);
        localStorage.setItem("username", username);
        onLogin();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-name">F4</div>
          <div className="auth-brand-sub">Premium Barbershop</div>
          <div className="auth-brand-desc">
            Классические стрижки, уход за бородой и опасное бритьё —<br />
            в атмосфере настоящего мужского клуба.
          </div>
          <div className="auth-features">
            <div className="auth-feature"><span className="auth-feature-dot" />Онлайн-запись 24/7</div>
            <div className="auth-feature"><span className="auth-feature-dot" />4 опытных мастера</div>
            <div className="auth-feature"><span className="auth-feature-dot" />Работаем с 09:00 до 19:00</div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-form-title">Добро пожаловать</div>
          <div className="auth-form-hint">Войдите или создайте аккаунт для записи</div>

          <div className="auth-tabs">
            <button className={`auth-tab ${mode === "login"    ? "active" : ""}`} onClick={() => setMode("login")}>Вход</button>
            <button className={`auth-tab ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>Регистрация</button>
          </div>

          {error   && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}

          <form onSubmit={submit}>
            <div className="field">
              <label>Логин</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="your_name" required />
            </div>
            <div className="field">
              <label>Пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="btn-gold" disabled={loading}>
              {loading ? <span className="spinner" /> : mode === "login" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Booking Modal ────────────────────────────────────────────────────────────

function BookingModal({ stations, allBookings, onClose, onDone, toast }) {
  const [stationId, setStationId] = useState(stations[0]?.id ?? "");
  const [date,      setDate]      = useState(todayStr());
  const [time,      setTime]      = useState("");
  const [service,   setService]   = useState(SERVICES[0].id);
  const [loading,   setLoading]   = useState(false);

  const taken = allBookings
    .filter(b => String(b.station_id) === String(stationId) && b.date === date)
    .map(b => b.time.slice(0, 5));

  async function submit() {
    if (!time) { toast("Выберите время", "err"); return; }
    setLoading(true);
    try {
      await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({ station_id: Number(stationId), date, time, service }),
      });
      toast("Запись создана!");
      onDone(); onClose();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setLoading(false);
    }
  }

  const svcObj = SERVICES.find(s => s.id === service);

  return createPortal(
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Новая запись</div>

        <div className="form-row">
          <div className="fld">
            <label>Мастер</label>
            <select value={stationId} onChange={e => { setStationId(e.target.value); setTime(""); }}>
              {stations.map(s => <option key={s.id} value={s.id}>#{s.number} {s.name}</option>)}
            </select>
          </div>
          <div className="fld">
            <label>Дата</label>
            <input type="date" value={date} min={todayStr()} onChange={e => { setDate(e.target.value); setTime(""); }} />
          </div>
        </div>

        <span className="slots-label">Выберите время</span>
        <div className="slots-grid">
          {TIME_SLOTS.map(t => (
            <button
              key={t}
              className={`slot ${time === t ? "picked" : ""}`}
              disabled={taken.includes(t)}
              onClick={() => setTime(t)}
            >{t}</button>
          ))}
        </div>

        <span className="slots-label">Услуга</span>
        <div className="services-grid">
          {SERVICES.map(s => (
            <button key={s.id} className={`svc-btn ${service === s.id ? "picked" : ""}`} onClick={() => setService(s.id)}>
              <span className="svc-icon">{s.icon}</span>
              <span className="svc-info">
                <span className="svc-name">{s.id}</span>
                <span className="svc-meta">{s.duration} · <span className="price-tag">{s.price} ₽</span></span>
              </span>
            </button>
          ))}
        </div>

        {time && svcObj && (
          <div style={{ background: "rgba(201,160,85,.08)", border: "1px solid rgba(201,160,85,.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13 }}>
            ✓ {fmt(date)} в {time} · {svcObj.id} · {svcObj.duration} · <strong style={{ color: "var(--gold)" }}>{svcObj.price} ₽</strong>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-outline" onClick={onClose}>Отмена</button>
          <button className="btn-submit" onClick={submit} disabled={loading || !time}>
            {loading ? <span className="spinner" /> : "Записаться"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Bookings Page ────────────────────────────────────────────────────────────

function BookingsPage({ bookings, stations, allBookings, onDelete, onRefresh, toast }) {
  const [showModal, setShowModal] = useState(false);
  const isAdmin = getRole() === "admin";

  const upcoming = bookings.filter(b => bookingStatus(b.date) !== "past");
  const past     = bookings.filter(b => bookingStatus(b.date) === "past");

  function CardList({ list }) {
    if (!list.length) return null;
    return (
      <div className="bookings-grid">
        {list.map(b => {
          const s   = bookingStatus(b.date);
          const svc = SERVICES.find(x => x.id === b.service);
          return (
            <div key={b.id} className={`bcard ${s}`}>
              <div className="bcard-top">
                <span className="bcard-service-icon">{svc?.icon ?? "💈"}</span>
                <span className={`bcard-badge ${s}`}>{statusLabel(s)}</span>
              </div>
              <div className="bcard-service">{b.service}</div>
              <div className="bcard-meta">
                <span className="meta-pill">📅 {fmt(b.date)}</span>
                <span className="meta-pill">🕐 {b.time.slice(0,5)}</span>
                <span className="meta-pill">💺 Стол #{b.station_number}</span>
                {svc && <span className="meta-pill price-tag">{svc.price} ₽</span>}
              </div>
              <div className="bcard-footer">
                {isAdmin
                  ? <span className="bcard-client">👤 {b.username}</span>
                  : <span className="bcard-client">{svc?.duration ?? ""}</span>
                }
                {s !== "past" && (
                  <button className="btn-cancel" onClick={() => onDelete(b.id)}>Отменить</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">{isAdmin ? "Все записи" : "Мои записи"}</div>
          <div className="topbar-sub">{upcoming.length} предстоящих · {past.length} прошедших</div>
        </div>
        <button className="btn-new" onClick={() => setShowModal(true)}>+ Записаться</button>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">💈</span>
          <p>Записей пока нет.<br />Нажмите «Записаться» чтобы выбрать мастера и время.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <div className="section-label">Предстоящие</div>
              <CardList list={upcoming} />
            </>
          )}
          {past.length > 0 && (
            <>
              <div className="section-label">Прошедшие</div>
              <CardList list={past} />
            </>
          )}
        </>
      )}

      {showModal && (
        <BookingModal
          stations={stations}
          allBookings={allBookings}
          onClose={() => setShowModal(false)}
          onDone={onRefresh}
          toast={toast}
        />
      )}
    </>
  );
}

// ─── Masters Page ─────────────────────────────────────────────────────────────

function MastersPage({ stations }) {
  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Наши мастера</div>
          <div className="topbar-sub">{plur(stations.length, "специалист", "специалиста", "специалистов")}</div>
        </div>
      </div>
      <div className="masters-grid">
        {stations.map((s, i) => {
          const specs = SPECS[i % SPECS.length];
          return (
            <div key={s.id} className="master-card">
              <div className="master-avatar">✂️</div>
              <div className="master-num">{s.name}</div>
              <div className="master-title">Мастер · Стол #{s.number}</div>
              <div className="master-specs">
                {specs.map(sp => <span key={sp} className="master-spec">{sp}</span>)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Admin Stations Page ──────────────────────────────────────────────────────

function StationsPage({ stations, onRefresh, toast }) {
  const [num,     setNum]     = useState("");
  const [name,    setName]    = useState("");
  const [loading, setLoading] = useState(false);

  async function add() {
    if (!num || !name) { toast("Заполните номер и имя", "err"); return; }
    setLoading(true);
    try {
      await apiFetch("/stations", { method: "POST", body: JSON.stringify({ number: Number(num), name }) });
      toast("Мастер добавлен!"); setNum(""); setName(""); onRefresh();
    } catch (err) { toast(err.message, "err"); }
    finally { setLoading(false); }
  }

  async function del(id) {
    try {
      await apiFetch(`/stations/${id}`, { method: "DELETE" });
      toast("Стол удалён"); onRefresh();
    } catch (err) { toast(err.message, "err"); }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Управление столами</div>
          <div className="topbar-sub">Добавляйте и удаляйте рабочие места</div>
        </div>
      </div>

      <div className="add-form">
        <input className="inp-num"  type="number" placeholder="№"          value={num}  onChange={e => setNum(e.target.value)}  />
        <input className="inp-name" type="text"   placeholder="Имя мастера" value={name} onChange={e => setName(e.target.value)} />
        <button className="btn-gold" style={{ width: "auto", padding: "12px 24px", marginTop: 0 }} onClick={add} disabled={loading}>
          {loading ? <span className="spinner" /> : "Добавить"}
        </button>
      </div>

      <div className="st-list">
        {stations.map(s => (
          <div key={s.id} className="st-row">
            <div className="st-info">
              <div className="st-num">{s.number}</div>
              <span className="st-name">{s.name}</span>
            </div>
            <button className="btn-cancel" onClick={() => del(s.id)}>Удалить</button>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ onLogout }) {
  const [tab,      setTab]      = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const { list: toasts, add: toast } = useToast();

  const isAdmin  = getRole() === "admin";
  const username = getUsername();
  const open     = isShopOpen();

  // загружаем записи и мастеров параллельно — используем allSettled чтобы
  // ошибка в одном запросе не ломала другой
  const load = useCallback(async () => {
    const [bResult, sResult] = await Promise.allSettled([
      apiFetch("/bookings"),
      apiFetch("/stations"),
    ]);
    if (sResult.status === "fulfilled") setStations(sResult.value);
    if (bResult.status === "fulfilled") setBookings(bResult.value);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deleteBooking(id) {
    try {
      await apiFetch(`/bookings/${id}`, { method: "DELETE" });
      toast("Запись отменена"); load();
    } catch (err) { toast(err.message, "err"); }
  }

  async function logout() {
    // просто чистим локальное хранилище — токен на сервере истечёт сам
    localStorage.clear();
    onLogout();
  }

  const upcoming = bookings.filter(b => bookingStatus(b.date) !== "past");
  const todayCount = bookings.filter(b => b.date === todayStr()).length;

  const NAV = [
    { id: "bookings", icon: "📋", label: "Записи",  badge: upcoming.length || null },
    { id: "masters",  icon: "✂️",  label: "Мастера", badge: null },
    ...(isAdmin ? [{ id: "stations", icon: "💺", label: "Столы", badge: null }] : []),
  ];

  return (
    <div className="app-layout">
      <Toasts list={toasts} />

      <aside className="sidebar">
        <div className="sb-logo">
          <div className="sb-logo-name">F4</div>
          <div className="sb-logo-tagline">Barbershop</div>
          <div className="sb-status">
            <span className={`status-dot ${open ? "open" : "closed"}`} />
            <span style={{ fontSize: 12, color: open ? "#5cb87a" : "var(--muted)" }}>
              {open ? "Открыто до 19:00" : "Закрыто"}
            </span>
          </div>
        </div>

        <nav className="sb-nav">
          {NAV.map(n => (
            <button key={n.id} className={`nav-btn ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
              <span className="nb-icon">{n.icon}</span>
              {n.label}
              {n.badge ? <span className="nav-badge">{n.badge}</span> : null}
            </button>
          ))}
        </nav>

        <div className="sb-bottom">
          <div className="sb-user">
            <div className="user-av">{username?.[0]?.toUpperCase() ?? "U"}</div>
            <div>
              <div className="user-name">{username}</div>
              <div className="user-role">{isAdmin ? "Администратор" : "Клиент"}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>Выйти</button>
        </div>
      </aside>

      <main className="main">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
            <span className="spinner light" style={{ width: 36, height: 36, borderWidth: 3 }} />
          </div>
        ) : (
          <>
            {tab === "bookings" && (
              <>
                {isAdmin ? (
                  <div className="stats-row">
                    <div className="stat-card"><div className="stat-label">Всего записей</div><div className="stat-value">{bookings.length}</div></div>
                    <div className="stat-card"><div className="stat-label">Предстоящих</div><div className="stat-value">{upcoming.length}</div></div>
                    <div className="stat-card"><div className="stat-label">На сегодня</div><div className="stat-value">{todayCount}</div></div>
                    <div className="stat-card"><div className="stat-label">Мастеров</div><div className="stat-value">{stations.length}</div></div>
                  </div>
                ) : (
                  <div className="stats-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    <div className="stat-card"><div className="stat-label">Всего визитов</div><div className="stat-value">{bookings.length}</div></div>
                    <div className="stat-card"><div className="stat-label">Предстоящих</div><div className="stat-value">{upcoming.length}</div></div>
                    <div className="stat-card">
                      <div className="stat-label">Следующий визит</div>
                      <div className="stat-value" style={{ fontSize: upcoming[0] ? 20 : 36 }}>
                        {upcoming[0] ? fmt(upcoming[0].date) : "—"}
                      </div>
                      {upcoming[0] && <div className="stat-sub">{upcoming[0].time.slice(0,5)} · {upcoming[0].service}</div>}
                    </div>
                  </div>
                )}

                <BookingsPage
                  bookings={bookings}
                  stations={stations}
                  allBookings={bookings}
                  onDelete={deleteBooking}
                  onRefresh={load}
                  toast={toast}
                />
              </>
            )}

            {tab === "masters" && <MastersPage stations={stations} />}

            {tab === "stations" && isAdmin && <StationsPage stations={stations} onRefresh={load} toast={toast} />}
          </>
        )}
      </main>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [in_, setIn] = useState(!!getToken());
  return in_
    ? <Dashboard onLogout={() => setIn(false)} />
    : <AuthPage   onLogin={()  => setIn(true)}  />;
}
