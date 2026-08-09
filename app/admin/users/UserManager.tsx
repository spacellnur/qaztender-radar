"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";

type User = { id: string; username: string; isActive: number; profileComplete: number; companyName?: string | null };

export default function UserManager({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [message, setMessage] = useState("");
  async function load() { const response = await fetch("/api/admin/users"); if (response.ok) setUsers((await response.json()).users); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const form = event.currentTarget; const data = new FormData(form);
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: data.get("username"), password: data.get("password") }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error);
    form.reset(); setMessage("Тендерщик создан. Передайте ему логин и временный пароль безопасным способом."); await load();
  }
  return <main className="management-shell"><header className="management-head"><Link href="/">← В радар</Link><div><p>УПРАВЛЕНИЕ ДОСТУПОМ</p><h1>Команда тендерщиков</h1></div></header><section className="management-grid"><form className="panel-form" onSubmit={submit}><h2>Новый тендерщик</h2><p>Роль назначается автоматически. Этот пользователь не сможет создавать другие аккаунты.</p><label>Логин<input name="username" pattern="[a-z0-9._-]{4,40}" required /></label><label>Временный пароль<input name="password" type="password" minLength={10} required /></label><button type="submit">Создать аккаунт</button>{message && <p role="status" className="form-message">{message}</p>}</form><section className="team-list"><div className="team-title"><h2>Аккаунты</h2><span>{users.length}</span></div>{users.length === 0 ? <p className="empty-copy">Тендерщиков пока нет.</p> : users.map(user => <article key={user.id}><div className="team-avatar">Т</div><div><strong>{user.username}</strong><small>{user.companyName || "Компания не заполнена"}</small></div><span className={user.profileComplete ? "status-ready" : "status-wait"}>{user.profileComplete ? "Профиль готов" : "Ждёт анкету"}</span></article>)}</section></section></main>;
}
