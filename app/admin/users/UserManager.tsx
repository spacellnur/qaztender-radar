"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import type { TelegramSubscriberStatus } from "../../tender-types";

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

export default function UserManager({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  async function load() {
    const response = await fetch("/api/admin/users");
    if (response.ok) {
      const data = await response.json() as { users: User[] };
      setUsers(data.users);
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
    setMessage("Тендерщик создан. Передайте ему логин и временный пароль безопасным способом.");
    await load();
  }

  async function setTgStatus(userId: string, status: TelegramSubscriberStatus) {
    setUpdatingId(userId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      if (response.ok) {
        await load();
      }
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <main className="management-shell">
      <header className="management-head">
        <Link href="/">← В радар</Link>
        <div>
          <p>УПРАВЛЕНИЕ ДОСТУПОМ</p>
          <h1>Команда тендерщиков</h1>
        </div>
      </header>
      <section className="management-grid">
        <form className="panel-form" onSubmit={submit}>
          <h2>Новый тендерщик</h2>
          <p>Роль назначается автоматически. Этот пользователь не сможет создавать другие аккаунты.</p>
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
            <h2>Аккаунты</h2>
            <span>{users.length}</span>
          </div>
          {users.length === 0 ? (
            <p className="empty-copy">Тендерщиков пока нет.</p>
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
                  {user.telegramStatus && (
                    <div className="tg-status-block">
                      <span className={`tg-pill ${user.telegramStatus}`}>
                        {user.telegramStatus === "approved" && "✈ TG: Одобрен"}
                        {user.telegramStatus === "pending" && "⏳ TG: Ждёт одобрения"}
                        {user.telegramStatus === "rejected" && "❌ TG: Отклонен"}
                        {user.telegramStatus === "paused" && "⏸ TG: Пауза"}
                      </span>
                      {user.telegramStatus === "pending" && (
                        <div className="tg-action-btns">
                          <button type="button" className="btn-approve" disabled={updatingId === user.id} onClick={() => setTgStatus(user.id, "approved")}>Одобрить</button>
                          <button type="button" className="btn-reject" disabled={updatingId === user.id} onClick={() => setTgStatus(user.id, "rejected")}>Отклонить</button>
                        </div>
                      )}
                      {user.telegramStatus === "approved" && (
                        <button type="button" className="btn-pause" disabled={updatingId === user.id} onClick={() => setTgStatus(user.id, "paused")}>Отключить</button>
                      )}
                      {user.telegramStatus === "paused" && (
                        <button type="button" className="btn-approve" disabled={updatingId === user.id} onClick={() => setTgStatus(user.id, "approved")}>Возобновить</button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}

