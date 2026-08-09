"use client";

import { FormEvent, useState } from "react";

export default function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
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
    <form className="login-form" onSubmit={submit}>
      <label>Логин<input name="username" autoComplete="username" required /></label>
      <label>Пароль<input name="password" type="password" autoComplete="current-password" required /></label>
      {error && <p className="login-error" role="alert">{error}</p>}
      <button type="submit" disabled={pending}>{pending ? "Проверяем…" : "Войти"}</button>
    </form>
  );
}
