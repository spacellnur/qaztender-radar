"use client";

import { FormEvent, useState } from "react";

export default function LoginForm() {
  const [tab, setTab] = useState<"telegram" | "password">("telegram");
  const [tgCode, setTgCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submitTelegramCode(e: FormEvent) {
    e.preventDefault();
    if (!tgCode || tgCode.trim().length < 6) {
      setError("Введите полный 6-значный код из бота");
      return;
    }
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/telegram-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: tgCode.trim() }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string; redirectUrl?: string } | null;
      if (!response.ok) {
        setError(result?.error ?? "Неверный или просроченный код. Отправьте /web в боте.");
        return;
      }
      window.location.assign(result?.redirectUrl || "/");
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.get("username"), password: data.get("password") }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        setError(result?.error ?? "Не удалось войти. Попробуйте ещё раз.");
        return;
      }
      window.location.assign("/");
    } catch {
      setError("Сервис временно недоступен. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login-container">
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", background: "rgba(255,255,255,0.05)", padding: "4px", borderRadius: "10px" }}>
        <button
          type="button"
          onClick={() => { setTab("telegram"); setError(""); }}
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "13px",
            background: tab === "telegram" ? "var(--accent, #0088cc)" : "transparent",
            color: tab === "telegram" ? "#fff" : "rgba(255,255,255,0.6)",
            transition: "all 0.2s ease",
          }}
        >
          🚀 Через Telegram
        </button>
        <button
          type="button"
          onClick={() => { setTab("password"); setError(""); }}
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "13px",
            background: tab === "password" ? "rgba(255,255,255,0.15)" : "transparent",
            color: tab === "password" ? "#fff" : "rgba(255,255,255,0.6)",
            transition: "all 0.2s ease",
          }}
        >
          🔑 Логин и пароль
        </button>
      </div>

      {tab === "telegram" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "rgba(0, 136, 204, 0.08)", border: "1px solid rgba(0, 136, 204, 0.25)", borderRadius: "12px", padding: "14px" }}>
            <p style={{ margin: "0 0 10px 0", fontSize: "13px", lineHeight: "1.5", color: "rgba(255,255,255,0.85)" }}>
              Нажмите кнопку ниже, чтобы перейти в бот и получить <strong>мгновенную ссылку для входа</strong>:
            </p>
            <a
              href="https://t.me/QazTendeRadar_bot?start=web"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px 16px",
                background: "#0088cc",
                color: "#ffffff",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "14px",
                boxShadow: "0 2px 8px rgba(0, 136, 204, 0.3)",
              }}
            >
              🤖 Открыть Telegram-бота для входа
            </a>
          </div>

          <form onSubmit={submitTelegramCode} className="login-form">
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
              <span>Или введите <strong>6-значный код</strong> из бота:</span>
              <input
                type="text"
                maxLength={6}
                placeholder="Например: 749218"
                value={tgCode}
                onChange={(e) => setTgCode(e.target.value.replace(/\D/g, ""))}
                style={{
                  fontSize: "20px",
                  letterSpacing: "4px",
                  textAlign: "center",
                  fontWeight: "bold",
                  padding: "10px",
                }}
                required
              />
            </label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button type="submit" disabled={pending || tgCode.length < 6}>
              {pending ? "Авторизуем…" : "Подтвердить код и войти"}
            </button>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
              Подсказка: напишите команду <code>/web</code> боту @QazTendeRadar_bot
            </p>
          </form>
        </div>
      ) : (
        <form className="login-form" onSubmit={submitPassword}>
          <label>Логин<input name="username" autoComplete="username" required /></label>
          <label>Пароль<input name="password" type="password" autoComplete="current-password" required /></label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button type="submit" disabled={pending}>{pending ? "Проверяем…" : "Войти"}</button>
        </form>
      )}
    </div>
  );
}

