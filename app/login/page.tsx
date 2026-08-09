import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Вход — QazTender Radar" };

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand"><span>QT</span> QazTender Radar</div>
        <p className="login-eyebrow">Защищённая рабочая область</p>
        <h1 id="login-title">Вход в систему</h1>
        <p className="login-intro">Введите данные вашей учётной записи, чтобы открыть анализ тендеров.</p>
        <LoginForm />
        <p className="login-note">Доступ выдаёт главный администратор.</p>
      </section>
    </main>
  );
}
