"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import type { TelegramSubscriber, TelegramSubscriberStatus } from "../../tender-types";

type User = {
  id: string;
  username: string;
  isActive: number;
  profileComplete: number;
  companyName?: string | null;
  telegramStatus?: TelegramSubscriberStatus | null;
  telegramUsername?: string | null;
  telegramChatId?: string | null;
};

type Stats = {
  totalUsers: number;
  activeTrial: number;
  activePaid: number;
  expired: number;
  activeToday: number;
  totalReferrals: number;
  subscribers: TelegramSubscriber[];
};

export default function UserManager({ initialUsers, initialStats }: { initialUsers: User[]; initialStats?: Stats }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [stats, setStats] = useState<Stats | undefined>(initialStats);
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  async function load() {
    const response = await fetch("/api/admin/users");
    if (response.ok) {
      const data = await response.json() as { users: User[]; stats?: Stats };
      setUsers(data.users);
      if (data.stats) setStats(data.stats);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: data.get("username"), password: data.get("password") }),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) return setMessage(result.error || "Ошибка создания");
    form.reset();
    setMessage("Пользователь успешно создан.");
    await load();
  }

  async function grantDays(chatId: string, days: number) {
    setUpdatingId(chatId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, grantDays: days }),
      });
      if (response.ok) {
        await load();
      }
    } finally {
      setUpdatingId("");
    }
  }

  const now = Date.now();

  return (
    <main className="management-shell">
      <header className="management-head">
        <Link href="/">← В радар</Link>
        <div>
          <p>ЦЕНТР УПРАВЛЕНИЯ ЭКОСИСТЕМОЙ</p>
          <h1>Статистика и пользователи</h1>
        </div>
      </header>

      {stats && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "16px", borderRadius: "12px" }}>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>👥 Всего в боте</span>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#fff", marginTop: "4px" }}>{stats.totalUsers}</div>
          </div>
          <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "16px", borderRadius: "12px" }}>
            <span style={{ fontSize: "12px", color: "#34d399", textTransform: "uppercase" }}>⚡ Активных за 24ч</span>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#34d399", marginTop: "4px" }}>{stats.activeToday}</div>
          </div>
          <div style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)", padding: "16px", borderRadius: "12px" }}>
            <span style={{ fontSize: "12px", color: "#60a5fa", textTransform: "uppercase" }}>🎁 На триале (3 дн.)</span>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#60a5fa", marginTop: "4px" }}>{stats.activeTrial}</div>
          </div>
          <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", padding: "16px", borderRadius: "12px" }}>
            <span style={{ fontSize: "12px", color: "#fbbf24", textTransform: "uppercase" }}>💎 С платной подпиской</span>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#fbbf24", marginTop: "4px" }}>{stats.activePaid}</div>
          </div>
          <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "16px", borderRadius: "12px" }}>
            <span style={{ fontSize: "12px", color: "#f87171", textTransform: "uppercase" }}>🔒 Истёк доступ</span>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#f87171", marginTop: "4px" }}>{stats.expired}</div>
          </div>
          <div style={{ background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.25)", padding: "16px", borderRadius: "12px" }}>
            <span style={{ fontSize: "12px", color: "#c084fc", textTransform: "uppercase" }}>🔗 Рефералов приглашено</span>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#c084fc", marginTop: "4px" }}>{stats.totalReferrals}</div>
          </div>
        </section>
      )}

      {stats && stats.subscribers.length > 0 && (
        <section style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#fff", margin: 0 }}>
              📱 Пользователи Telegram-бота ({stats.subscribers.length})
            </h2>
            <button
              type="button"
              onClick={load}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
            >
              🔄 Обновить данные
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left", color: "rgba(255,255,255,0.5)" }}>
                  <th style={{ padding: "10px" }}>Пользователь</th>
                  <th style={{ padding: "10px" }}>Chat ID</th>
                  <th style={{ padding: "10px" }}>Статус доступа</th>
                  <th style={{ padding: "10px" }}>Срок действия</th>
                  <th style={{ padding: "10px" }}>Рефералы</th>
                  <th style={{ padding: "10px" }}>Управление</th>
                </tr>
              </thead>
              <tbody>
                {stats.subscribers.map((sub) => {
                  const subExp = sub.subscriptionExpiresAt || 0;
                  const trialExp = sub.trialExpiresAt || (sub.createdAt + 3 * 86400000);
                  const isPaid = subExp > now;
                  const isTrial = !isPaid && trialExp > now;
                  const targetExp = isPaid ? subExp : trialExp;
                  const daysLeft = Math.max(0, Math.ceil((targetExp - now) / 86400000));
                  const expDateStr = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(targetExp);

                  return (
                    <tr key={sub.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "12px 10px" }}>
                        <strong style={{ color: "#fff" }}>{sub.firstName || "Пользователь"}</strong>
                        {sub.username && <span style={{ color: "#0088cc", marginLeft: "6px" }}>@{sub.username}</span>}
                      </td>
                      <td style={{ padding: "12px 10px", fontFamily: "monospace", color: "rgba(255,255,255,0.6)" }}>
                        {sub.chatId}
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        {isPaid && <span style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", padding: "4px 8px", borderRadius: "6px", fontWeight: 600, fontSize: "11px" }}>💎 Оплачен</span>}
                        {isTrial && <span style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", padding: "4px 8px", borderRadius: "6px", fontWeight: 600, fontSize: "11px" }}>🎁 Триал ({daysLeft} дн.)</span>}
                        {!isPaid && !isTrial && <span style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", padding: "4px 8px", borderRadius: "6px", fontWeight: 600, fontSize: "11px" }}>🔒 Истёк</span>}
                      </td>
                      <td style={{ padding: "12px 10px", color: "rgba(255,255,255,0.8)" }}>
                        до {expDateStr}
                      </td>
                      <td style={{ padding: "12px 10px", color: "rgba(255,255,255,0.7)" }}>
                        {sub.referralsCount || 0} чел.
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            disabled={updatingId === sub.chatId}
                            onClick={() => grantDays(sub.chatId, 30)}
                            style={{
                              background: "#0088cc",
                              color: "#fff",
                              border: "none",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "11px",
                              fontWeight: 600,
                            }}
                          >
                            +30 дней
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === sub.chatId}
                            onClick={() => grantDays(sub.chatId, 3)}
                            style={{
                              background: "rgba(255,255,255,0.1)",
                              color: "#fff",
                              border: "none",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "11px",
                            }}
                          >
                            +3 дня
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="management-grid">
        <form className="panel-form" onSubmit={submit}>
          <h2>Создать аккаунт на сайте</h2>
          <p>Логин и пароль для прямого веб-доступа сотрудника.</p>
          <label>
            Логин
            <input name="username" pattern="[a-z0-9._-]{4,40}" required />
          </label>
          <label>
            Временный пароль
            <input name="password" type="password" minLength={10} required />
          </label>
          <button type="submit">Создать аккаунт</button>
          {message && <p role="status" className="form-message">{message}</p>}
        </form>

        <section className="team-list">
          <div className="team-title">
            <h2>Веб-аккаунты</h2>
            <span>{users.length}</span>
          </div>
          {users.length === 0 ? (
            <p className="empty-copy">Веб-пользователей пока нет.</p>
          ) : (
            users.map((user) => (
              <article key={user.id} className="team-member-card">
                <div className="team-avatar">Т</div>
                <div className="team-member-info">
                  <strong>{user.username}</strong>
                  <small>{user.companyName || "Компания не заполнена"}</small>
                  {user.telegramUsername && <small className="tg-handle">✈ @{user.telegramUsername}</small>}
                </div>
                <div className="team-member-badges">
                  <span className={user.profileComplete ? "status-ready" : "status-wait"}>
                    {user.profileComplete ? "Профиль готов" : "Ждёт анкету"}
                  </span>
                </div>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}


