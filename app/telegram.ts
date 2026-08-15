import {
  consumeTelegramConnectToken, createOrUpdateTelegramSubscriber, createTenderNote,
  getCompanyProfile, getDbUserById, getTelegramFilter,
  getTelegramSubscriberByChatId, getTelegramSubscriberByUserId, getTenderById,
  getTenderDetails, getTenderTask, getTenderTaskWorkspace, INDUSTRY_CATEGORIES,
  IndustryCategory, isTenderDeliveredToUser, listApprovedTelegramSubscribers,
  listTenderNotes, listTenders, listTenderWorkflow, recordTelegramDelivery,
  saveTelegramFilter, saveTenderWorkflow, seedTenderTaskTemplate,
  updateTelegramSubscriberStatus, updateTenderTask
} from "./db";
import { localities } from "./TenderDashboard";
import { explainTenderMatch } from "./tender-matching";
import type { CompanyProfile, TenderRecord, TenderStage } from "./tender-types";

function getBotToken(): string {
  const env = (globalThis as unknown as { __QAZTENDER_ENV?: Record<string, string> }).__QAZTENDER_ENV;
  return process.env.TELEGRAM_BOT_TOKEN || env?.TELEGRAM_BOT_TOKEN || "8719115205:AAFO6sZ6p0HN_IKFFpnDGp97fTYQ6hxTpoM";
}

export function getAdminChatId(): string {
  const env = (globalThis as unknown as { __QAZTENDER_ENV?: Record<string, string> }).__QAZTENDER_ENV;
  return process.env.ADMIN_TELEGRAM_CHAT_ID || env?.ADMIN_TELEGRAM_CHAT_ID || "964524397";
}

export const MAIN_REPLY_KEYBOARD = {
  keyboard: [
    [{ text: "🎯 Мои тендеры" }, { text: "📁 Мои в работе" }],
    [{ text: "🔥 Горящие тендеры" }, { text: "💎 Топ по бюджету" }],
    [{ text: "⚙️ Настроить фильтр" }, { text: "🔍 Найти тендер" }],
    [{ text: "📈 Мой статус" }, { text: "ℹ️ Справка о системе" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

function getLocalityLabel(val: string): string {
  const item = localities.find((l) => l.value === val);
  return item ? item.label : "Все населённые пункты";
}

function getCategoryLabel(val: string): string {
  const item = INDUSTRY_CATEGORIES.find((c) => c.id === val);
  return item ? item.label : "🌐 Все сферы деятельности";
}

const userSearchTimestamps = new Map<string, number[]>();
const userActionTimestamps = new Map<string, number[]>();
const userCooldownUntil = new Map<string, number>();

export const MAX_SEARCHES_PER_HOUR = 10; // 10 searches per hour for free text search / tender matching
export const MAX_BURST_ACTIONS = 6; // max 6 button clicks / commands within 4 seconds (Anti-Flood)

export function checkFloodSpam(chatId: string | number): { blocked: boolean; remainingSeconds: number } {
  const idStr = String(chatId);
  const adminId = getAdminChatId();
  if (idStr === adminId) return { blocked: false, remainingSeconds: 0 };

  const now = Date.now();
  const cooldown = userCooldownUntil.get(idStr) || 0;
  if (now < cooldown) {
    return { blocked: true, remainingSeconds: Math.ceil((cooldown - now) / 1000) };
  }

  const fourSecAgo = now - 4000;
  let actions = (userActionTimestamps.get(idStr) || []).filter((t) => t > fourSecAgo);
  actions.push(now);
  userActionTimestamps.set(idStr, actions);

  if (actions.length > MAX_BURST_ACTIONS) {
    const penaltyMs = 60 * 1000; // 60s cooldown
    userCooldownUntil.set(idStr, now + penaltyMs);
    return { blocked: true, remainingSeconds: 60 };
  }

  return { blocked: false, remainingSeconds: 0 };
}

export function checkSearchRateLimit(chatId: string | number): { allowed: boolean; remaining: number; resetMinutes: number } {
  const idStr = String(chatId);
  const adminId = getAdminChatId();
  if (idStr === adminId) return { allowed: true, remaining: 9999, resetMinutes: 0 };

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  let timestamps = (userSearchTimestamps.get(idStr) || []).filter((ts) => ts > oneHourAgo);

  if (timestamps.length >= MAX_SEARCHES_PER_HOUR) {
    const oldest = timestamps[0];
    const resetMinutes = Math.max(1, Math.ceil((oldest + 60 * 60 * 1000 - now) / 60000));
    userSearchTimestamps.set(idStr, timestamps);
    return { allowed: false, remaining: 0, resetMinutes };
  }

  timestamps.push(now);
  userSearchTimestamps.set(idStr, timestamps);
  return { allowed: true, remaining: MAX_SEARCHES_PER_HOUR - timestamps.length, resetMinutes: 0 };
}

export async function sendFilterSettingsMessage(chatId: string | number) {
  const currentFilter = await getTelegramFilter(String(chatId));
  const locLabel = getLocalityLabel(currentFilter.locality);
  const catLabel = getCategoryLabel(currentFilter.category);
  const budgetLabel = currentFilter.maxBudget > 0 ? `До ${moneyFormatter.format(currentFilter.maxBudget)}` : "Любой";

  const msg = `⚙️ <b>НАСТРОЙКИ ВАШЕГО ФИЛЬТРА ТЕНДЕРОВ</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
    `📍 <b>Город / Район / Село:</b>\n👉 <code>${locLabel}</code>\n\n` +
    `📁 <b>Сфера деятельности / Ниша:</b>\n👉 <code>${catLabel}</code>\n\n` +
    `💰 <b>Бюджет:</b> ${budgetLabel}\n\n` +
    `💡 <i>Нажмите кнопку ниже, чтобы изменить город, отрасль или бюджет:</i>`;

  const buttons = [
    [{ text: "📍 Сменить город / район", callback_data: "menu_locality" }],
    [{ text: "📁 Сменить сферу деятельности", callback_data: "menu_category" }],
    [{ text: currentFilter.maxBudget > 0 ? "💰 Бюджет: Ограничен" : "💰 Бюджет: Любой", callback_data: "menu_budget" }],
    [{ text: "🎯 Показать подходящие тендеры", callback_data: "cmd_my" }],
  ];

  await sendTelegramMessage(chatId, msg, { reply_markup: { inline_keyboard: buttons } });
}

export async function sendTelegramMessage(chatId: string | number, text: string, options?: {
  reply_markup?: {
    inline_keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
    keyboard?: Array<Array<{ text: string }>>;
    resize_keyboard?: boolean;
    is_persistent?: boolean;
  };
  parse_mode?: "HTML" | "MarkdownV2" | "Markdown";
}): Promise<{ ok: boolean; message_id?: number; description?: string }> {
  const token = getBotToken();
  if (!token) return { ok: false, description: "No bot token configured" };

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: options?.parse_mode ?? "HTML",
    disable_web_page_preview: true,
  };

  if (options?.reply_markup) {
    payload.reply_markup = options.reply_markup;
  } else {
    payload.reply_markup = MAIN_REPLY_KEYBOARD;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json() as { ok: boolean; result?: { message_id: number }; description?: string };
    return {
      ok: data.ok,
      message_id: data.result?.message_id,
      description: data.description,
    };
  } catch (error) {
    return { ok: false, description: error instanceof Error ? error.message : "Failed to send message" };
  }
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text ?? "",
        show_alert: showAlert,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function editMessageReplyMarkup(chatId: string | number, messageId: number, replyMarkup?: {
  inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
}): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;
  try {
    await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: replyMarkup ?? { inline_keyboard: [] },
      }),
    });
    return true;
  } catch {
    return false;
  }
}

const moneyFormatter = new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const STAGE_LABELS: Record<string, string> = {
  studying: "⏳ Изучаем",
  preparing: "📝 Готовим заявку",
  applied: "🚀 Подали заявку",
  won: "🏆 Победили",
  lost: "❌ Проиграли",
};

export function formatTenderTelegramCard(tender: TenderRecord, profile?: CompanyProfile | null, note?: string, isAdmin = false, currentStage?: string) {
  const match = profile ? explainTenderMatch(tender, profile) : null;
  const days = tender.endDate ? Math.ceil((tender.endDate - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  let text = `🏛 <b>ГОСЗАКУПКИ РК</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📋 <b>№ ${tender.numberAnno}</b> · ${tender.methodName}\n`;
  text += `📌 <b>${tender.title}</b>\n\n`;
  text += `💰 <b>Бюджет:</b> ${moneyFormatter.format(tender.budget)}\n`;
  text += `🏢 <b>Заказчик:</b> ${tender.buyer}\n`;
  text += `📍 <b>Регион:</b> ${tender.regionName}\n`;
  text += `⏳ <b>Приём заявок:</b> ${tender.endDate ? `${dateFormatter.format(tender.endDate)} (${days !== null ? `${days} дн.` : "скоро"})` : "Не указано"}\n`;

  if (currentStage && STAGE_LABELS[currentStage]) {
    text += `📂 <b>Статус:</b> <code>${STAGE_LABELS[currentStage]}</code>\n`;
  }

  if (match && match.matchedKeywords.length > 0) {
    text += `\n🎯 <b>Ключевые слова:</b> ${match.matchedKeywords.join(", ")}`;
  }

  if (note) {
    text += `\n\n💬 <b>Комментарий:</b>\n<i>«${note}»</i>`;
  }

  const buttons: Array<Array<{ text: string; url?: string; callback_data?: string }>> = [
    [
      { text: "🌐 На Goszakup", url: tender.sourceUrl },
      { text: "★ В избранное", callback_data: `fav:${tender.externalId}` },
    ],
    [
      { text: "📂 Статус в работе", callback_data: `menu_stage:${tender.externalId}` },
      { text: "📑 Чек-лист", callback_data: `tasks:${tender.externalId}` },
      { text: "📦 Лоты", callback_data: `lots:${tender.externalId}` },
    ],
    [
      { text: "💬 Заметки", callback_data: `notes:${tender.externalId}` },
      { text: "⛔ Скрыть", callback_data: `hide:${tender.externalId}` },
    ],
  ];

  if (isAdmin) {
    buttons.push([
      { text: "👤 Назначить сотруднику", callback_data: `delegate:${tender.externalId}` },
    ]);
  }

  return { text, buttons, reply_markup: { inline_keyboard: buttons } };
}

export async function notifyAdminAboutNewRequest(user: { id: string; username: string }, companyProfile: CompanyProfile | null, telegramUser: { id: number; username?: string; first_name?: string }) {
  const adminChatId = getAdminChatId();
  if (!adminChatId) return;

  const dateStr = dateFormatter.format(Date.now());
  let text = `🔔 <b>НОВАЯ ЗАЯВКА НА ПОДКЛЮЧЕНИЕ TELEGRAM</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
  text += `👤 <b>Пользователь:</b> @${user.username}\n`;
  text += `🏢 <b>Компания:</b> ${companyProfile?.companyName || "Не указано"}\n`;
  text += `📍 <b>Регионы:</b> ${companyProfile?.regions?.join(", ") || "Все"}\n`;
  text += `✈️ <b>Telegram:</b> ${telegramUser.username ? `@${telegramUser.username}` : telegramUser.first_name || "—"} (ID: <code>${telegramUser.id}</code>)\n`;
  text += `📅 <b>Дата:</b> ${dateStr}\n\n`;
  text += `Одобрить получение персональных уведомлений по тендерам?`;

  const buttons = [
    [
      { text: "✅ Одобрить доступ", callback_data: `approve_user:${user.id}:${telegramUser.id}` },
      { text: "❌ Отклонить", callback_data: `reject_user:${user.id}:${telegramUser.id}` },
    ],
  ];

  await sendTelegramMessage(adminChatId, text, { reply_markup: { inline_keyboard: buttons } });
}

export async function handleTelegramUpdate(update: {
  message?: {
    chat: { id: number; username?: string; first_name?: string };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; username?: string; first_name?: string };
    message?: { chat: { id: number }; message_id: number; text?: string };
    data?: string;
  };
}) {
  const adminChatId = getAdminChatId();

  // 1. Handling incoming text messages (/start, /status, /help, etc.)
  if (update.message?.text) {
    const text = update.message.text.trim();
    const chatId = String(update.message.chat.id);
    const tgUser = update.message.from ?? update.message.chat;

    // 1. Anti-Flood Spam Protection
    const flood = checkFloodSpam(chatId);
    if (flood.blocked) {
      await sendTelegramMessage(chatId, `🛑 <b>Слишком частые действия (анти-спам защита)</b>\n\nПожалуйста, подождите <b>${flood.remainingSeconds} сек.</b> перед следующим запросом.`);
      return { ok: true };
    }

    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const token = parts[1]?.trim();

      if (token) {
        const userId = await consumeTelegramConnectToken(token);
        if (userId) {
          const user = await getDbUserById(userId);
          const profile = await getCompanyProfile(userId);
          const isAdmin = user?.role === "super_admin" || String(tgUser.id) === adminChatId;

          // Create or update subscriber
          await createOrUpdateTelegramSubscriber({
            userId,
            chatId,
            username: tgUser.username ?? "",
            firstName: tgUser.first_name ?? "",
            status: isAdmin ? "approved" : "pending",
          });

          if (isAdmin) {
            await sendTelegramMessage(chatId, `👑 <b>Здравствуйте, Главный Администратор!</b>\n\nВаш Telegram успешно подключён к <b>QazTender Radar</b>. Сюда будут приходить заявки сотрудников на модерацию и системные отчёты.`);
          } else {
            await sendTelegramMessage(chatId, `⏳ <b>Заявка принята!</b>\n\nВаш аккаунт связан с ботом и отправлен Главному Администратору на одобрение.\n\nКак только администратор подтвердит доступ, вам начнут приходить лучшие тендеры и напоминания о дедлайнах.`);
            if (user) {
              await notifyAdminAboutNewRequest(user, profile, tgUser);
            }
          }
          return { ok: true };
        } else {
          await sendTelegramMessage(chatId, `⚠️ <b>Срок действия ссылки истёк или она недействительна.</b>\n\nПожалуйста, вернитесь на сайт QazTender Radar и нажмите кнопку «Подключить Telegram» заново.`);
          return { ok: true };
        }
      }

      // Plain /start without token
      if (chatId === adminChatId) {
        await sendTelegramMessage(chatId, `👑 <b>Здравствуйте, Главный Администратор!</b>\n━━━━━━━━━━━━━━━━━━━━\nВы авторизованы как Главный Администратор <b>QazTender Radar</b>.\n\n⚡ <b>Быстрые команды:</b>\n/hot — 🔥 Горящие тендеры (скоро дедлайн)\n/top — 💎 Крупнейшие закупки по бюджету\n/digest — 📊 Сводка по всем тендерам\n/status — ℹ️ Проверить статус системы\n\n🔔 <i>Сюда также приходят заявки сотрудников на модерацию.</i>`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔥 Горящие тендеры", callback_data: "cmd_hot" }, { text: "💎 Топ по бюджету", callback_data: "cmd_top" }],
              [{ text: "📊 Сводка дня", callback_data: "cmd_digest" }],
            ],
          },
        });
        return { ok: true };
      }

      const existing = await getTelegramSubscriberByChatId(chatId);
      if (existing) {
        if (existing.status === "approved") {
          await sendTelegramMessage(chatId, `✅ <b>Бот активен!</b>\n\nВы успешно подключены к QazTender Radar. Уведомления включены.\n\n⚡ Используйте команды:\n/hot — Горящие тендеры\n/top — Топ по бюджету\n/status — Статус подписки`);
        } else if (existing.status === "pending") {
          await sendTelegramMessage(chatId, `⏳ <b>Ваша заявка находится на рассмотрении.</b>\n\nОжидайте одобрения Главным Администратором.`);
        } else {
          await sendTelegramMessage(chatId, `⛔ <b>Ваш доступ к рассылке приостановлен или отклонен.</b>\n\nОбратитесь к Главному Администратору.`);
        }
      } else {
        await sendTelegramMessage(chatId, `👋 <b>Добро пожаловать в QazTender Radar Bot!</b>\n\nДля привязки аккаунта войдите в личный кабинет на сайте QazTender Radar и нажмите кнопку «Подключить Telegram».`);
      }
      return { ok: true };
    }

    if (text === "/hot" || text === "🔥 Горящие тендеры") {
      const tenders = await listTenders(100);
      const now = Date.now();
      const hot = tenders
        .filter((t) => t.endDate && t.endDate > now)
        .sort((a, b) => (a.endDate ?? 0) - (b.endDate ?? 0))
        .slice(0, 3);

      if (hot.length === 0) {
        await sendTelegramMessage(chatId, "ℹ️ На данный момент нет срочных активных объявлений. Запустите синхронизацию на сайте.");
        return { ok: true };
      }

      await sendTelegramMessage(chatId, `🔥 <b>ТОП-3 ГОРЯЩИХ ТЕНДЕРА (СКОРО ДЕДЛАЙН):</b>\n━━━━━━━━━━━━━━━━━━━━`);
      for (const tender of hot) {
        const card = formatTenderTelegramCard(tender);
        await sendTelegramMessage(chatId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
      }
      return { ok: true };
    }

    if (text === "/top" || text === "💎 Топ по бюджету") {
      const tenders = await listTenders(100);
      const top = [...tenders].sort((a, b) => b.budget - a.budget).slice(0, 3);

      if (top.length === 0) {
        await sendTelegramMessage(chatId, "ℹ️ Тендеры ещё не загружены в базу.");
        return { ok: true };
      }

      await sendTelegramMessage(chatId, `💎 <b>ТОП-3 КРУПНЕЙШИХ ТЕНДЕРА ПО БЮДЖЕТУ:</b>\n━━━━━━━━━━━━━━━━━━━━`);
      for (const tender of top) {
        const card = formatTenderTelegramCard(tender);
        await sendTelegramMessage(chatId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
      }
      return { ok: true };
    }

    if (text === "/digest" || text === "📊 Сводка рынка" || text === "📊 Сводка") {
      const tenders = await listTenders(500);
      const now = Date.now();
      const active = tenders.filter((t) => !t.endDate || t.endDate > now);
      const hotCount = active.filter((t) => t.endDate && (t.endDate - now) <= 3 * 86400000).length;
      const totalBudget = active.reduce((acc, t) => acc + t.budget, 0);

      const msg = `📊 <b>СВОДКА ТЕНДЕРОВ НА СЕГОДНЯ</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 Всего активных объявлений: <b>${active.length}</b>\n` +
        `🔥 Срочных (дедлайн ≤ 3 дней): <b>${hotCount}</b>\n` +
        `💰 Общий объём закупок: <b>${moneyFormatter.format(totalBudget)}</b>\n\n` +
        `💡 <i>Нажмите /hot для просмотра срочных или /top для крупных закупок.</i>`;

      await sendTelegramMessage(chatId, msg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔥 Горящие тендеры", callback_data: "cmd_hot" }, { text: "💎 Топ по бюджету", callback_data: "cmd_top" }],
          ],
        },
      });
      return { ok: true };
    }

    if (text === "/status" || text === "📈 Мой статус") {
      if (chatId === adminChatId) {
        await sendTelegramMessage(chatId, `👑 <b>Статус: Главный Администратор</b>\n━━━━━━━━━━━━━━━━━━━━\nChat ID: <code>${chatId}</code>\nДоступ: Полный административный\nЛимит запросов: Безлимитно\nМодерация заявок: Активна\n\n⚡ Нажимайте кнопки внизу для быстрого доступа к данным.`);
        return { ok: true };
      }

      const existing = await getTelegramSubscriberByChatId(chatId);
      if (!existing) {
        await sendTelegramMessage(chatId, `ℹ️ <b>Аккаунт не привязан.</b>\n\nВойдите в QazTender Radar и подключите бота через кнопку в профиле.`);
      } else {
        const statusMap: Record<string, string> = {
          approved: "✅ Активен (Одобрен администратором)",
          pending: "⏳ На рассмотрении администратором",
          rejected: "❌ Отклонен администратором",
          paused: "⏸ Приостановлен",
        };
        await sendTelegramMessage(chatId, `📊 <b>Статус подписки:</b> ${statusMap[existing.status] || existing.status}\n\nЛимит запросов: ${rate.remaining}/${MAX_REQUESTS_PER_HOUR} в этот час\nМгновенные алерты: ${existing.instantEnabled ? "Вкл" : "Выкл"}\nДайджест: ${existing.digestEnabled ? "Вкл" : "Выкл"}\n\nНапишите /info для справки по боту.`);
      }
      return { ok: true };
    }

    if (text === "/info" || text === "ℹ️ Инфо" || text === "ℹ️ О системе" || text === "ℹ️ Справка о системе") {
      const infoMsg = `ℹ️ <b>О СИСТЕМЕ QAZTENDER RADAR</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
        `<b>QazTender Radar</b> — радар и рабочее место для тендерных специалистов и поставщиков в Казахстане (Госзакупки goszakup.gov.kz).\n\n` +
        `🎯 <b>Ключевые возможности:</b>\n` +
        `• <b>Любые сферы бизнеса:</b> стройка, IT, поставка товаров, мебель, охрана, клининг, питание, транспорт, медицина\n` +
        `• <b>Точечный локальный фильтр:</b> выбор конкретного города (Туркестан, Кентау, Шаулдер), района и близлежащих сёл без шума по всей области\n` +
        `• <b>Защита от нагрузки:</b> лимит ${MAX_REQUESTS_PER_HOUR} запросов в час для стабильности серверов\n` +
        `• <b>Рабочее место:</b> чек-листы РК по 5 процедурам, заметки и таймлайн дедлайнов\n\n` +
        `⚡ <b>Быстрый поиск:</b> просто напишите боту ключевое слово (например: <i>компьютеры</i>, <i>мебель</i>, <i>охрана</i>, <i>Туркестан</i>) для мгновенного поиска!`;

      await sendTelegramMessage(chatId, infoMsg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔥 Горящие тендеры", callback_data: "cmd_hot" }, { text: "💎 Топ по бюджету", callback_data: "cmd_top" }],
            [{ text: "📊 Сводка дня", callback_data: "cmd_digest" }],
          ],
        },
      });
      return { ok: true };
    }

    if (text === "/inwork" || text === "📁 Мои в работе" || text === "📁 В работе") {
      const sub = await getTelegramSubscriberByChatId(chatId);
      const ownerKey = sub ? `user:${sub.userId}` : `admin:${chatId}`;
      const workflows = await listTenderWorkflow(ownerKey);
      const inWork = workflows.filter((w) => w.stage && w.stage !== "none" && w.stage !== "skipped");

      if (inWork.length === 0) {
        await sendTelegramMessage(chatId, `📁 <b>У вас пока нет тендеров в работе.</b>\n\nЧтобы добавить тендер в работу, откройте любой тендер через «🎯 Мои тендеры» или «🔥 Горящие» и нажмите кнопку <b>[ 📂 Статус в работе ]</b>.`);
        return { ok: true };
      }

      await sendTelegramMessage(chatId, `📁 <b>ВАШИ ТЕНДЕРЫ В РАБОТЕ (${inWork.length}):</b>\n━━━━━━━━━━━━━━━━━━━━`);
      for (const item of inWork.slice(0, 5)) {
        const tender = await getTenderById(item.tenderId);
        if (tender) {
          const card = formatTenderTelegramCard(tender, null, undefined, chatId === adminChatId, item.stage);
          await sendTelegramMessage(chatId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
        }
      }
      return { ok: true };
    }

    if (text.startsWith("/note")) {
      const parts = text.split(" ");
      const tenderId = parts[1]?.trim();
      const noteContent = parts.slice(2).join(" ").trim();

      if (!tenderId || !noteContent) {
        await sendTelegramMessage(chatId, `ℹ️ <b>Формат команды добавления заметки:</b>\n<code>/note НОМЕР_ТЕНДЕРА Текст вашей заметки</code>\n\n<i>Пример:</i>\n<code>/note 15234567-1 Согласовали с заказчиком минимальную цену 20 млн</code>`);
        return { ok: true };
      }

      const sub = await getTelegramSubscriberByChatId(chatId);
      const ownerKey = sub ? `user:${sub.userId}` : `admin:${chatId}`;
      const authorName = tgUser.first_name || tgUser.username || "Специалист";

      try {
        await createTenderNote(tenderId, ownerKey, authorName, noteContent);
        await sendTelegramMessage(chatId, `✅ <b>Заметка успешно добавлена!</b>\n\nОна сохранена в базе и доступна как в Telegram, так и на веб-сайте.`);
      } catch (err) {
        await sendTelegramMessage(chatId, `❌ Не удалось сохранить заметку: ${err instanceof Error ? err.message : "Ошибка базы"}`);
      }
      return { ok: true };
    }

    if (text === "/my" || text === "🎯 Мои тендеры" || text === "/custom") {
      const searchLimit = checkSearchRateLimit(chatId);
      if (!searchLimit.allowed) {
        await sendTelegramMessage(chatId, `⏳ <b>Лимит поиска исчерпан (${MAX_SEARCHES_PER_HOUR} поисков в час)</b>\n\nДля защиты базы и стабильности работы действует лимит на глубокий подбор тендеров.\n\nЛимит обновится через <b>${searchLimit.resetMinutes} мин.</b>\nВы можете продолжать менять фильтры или использовать веб-дашборд.`);
        return { ok: true };
      }

      const currentFilter = await getTelegramFilter(String(chatId));
      const tenders = await listTenders(500);
      const now = Date.now();
      const loc = localities.find((l) => l.value === currentFilter.locality);
      const cat = INDUSTRY_CATEGORIES.find((c) => c.id === currentFilter.category);

      const matched = tenders
        .filter((t) => !t.endDate || t.endDate > now)
        .filter((t) => {
          if (!loc || !loc.keywords || loc.keywords.length === 0) return true;
          const textToSearch = `${t.title} ${t.buyer} ${t.regionName} ${t.kato}`.toLowerCase();
          return loc.keywords.some((k) => textToSearch.includes(k));
        })
        .filter((t) => {
          if (!cat || !cat.keywords || cat.keywords.length === 0) return true;
          if (cat.id === "construction" && t.isConstructionWork) return true;
          const textToSearch = `${t.title} ${t.buyer} ${t.subjectType} ${t.methodName}`.toLowerCase();
          return cat.keywords.some((k) => textToSearch.includes(k));
        })
        .filter((t) => !currentFilter.maxBudget || t.budget <= currentFilter.maxBudget)
        .slice(0, 3);

      const locLabel = getLocalityLabel(currentFilter.locality);
      const catLabel = getCategoryLabel(currentFilter.category);

      if (matched.length === 0) {
        await sendTelegramMessage(chatId, `🎯 По вашему фильтру (<b>${locLabel}</b> | <b>${catLabel}</b>) сейчас нет активных объявлений.\n\nНажмите ⚙️ «Настроить фильтр», чтобы изменить отрасль, город или сумму.`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "⚙️ Настроить фильтр", callback_data: "open_filter_menu" }],
              [{ text: "🔥 Смотреть все горящие", callback_data: "cmd_hot" }],
            ],
          },
        });
        return { ok: true };
      }

      const remainingNote = chatId === adminChatId ? "" : `\n<i>(Осталось поисков: ${searchLimit.remaining}/${MAX_SEARCHES_PER_HOUR} на этот час)</i>`;
      await sendTelegramMessage(chatId, `🎯 <b>ВАШИ ПОДХОДЯЩИЕ ТЕНДЕРЫ\n(${locLabel} • ${catLabel}):</b>${remainingNote}\n━━━━━━━━━━━━━━━━━━━━`);
      for (const tender of matched) {
        const card = formatTenderTelegramCard(tender);
        await sendTelegramMessage(chatId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
      }
      return { ok: true };
    }

    if (text === "/filter" || text === "⚙️ Настроить фильтр" || text === "⚙️ Фильтр") {
      await sendFilterSettingsMessage(chatId);
      return { ok: true };
    }

    if (text === "🔍 Найти тендер") {
      await sendTelegramMessage(chatId, `🔍 <b>Умный поиск по госзакупкам</b>\n━━━━━━━━━━━━━━━━━━━━\nНапишите прямо в чат любое ключевое слово, название города (например: <i>Туркестан</i>, <i>школа</i>, <i>асфальт</i>) или номер объявления (например: <i>15234567-1</i>).`);
      return { ok: true };
    }

    // Free text Smart Search
    const searchWords = text.trim().toLowerCase();
    if (searchWords.length >= 2 && !searchWords.startsWith("/")) {
      const searchLimit = checkSearchRateLimit(chatId);
      if (!searchLimit.allowed) {
        await sendTelegramMessage(chatId, `⏳ <b>Лимит поиска исчерпан (${MAX_SEARCHES_PER_HOUR} поисков в час)</b>\n\nДля защиты базы и стабильности серверов действует лимит на глубокий поиск тендеров.\n\nЛимит обновится через <b>${searchLimit.resetMinutes} мин.</b>\nВы по-прежнему можете использовать веб-версию без ограничений.`);
        return { ok: true };
      }

      const tenders = await listTenders(500);
      const matches = tenders.filter((t) => {
        const full = `${t.title} ${t.buyer} ${t.customerBin} ${t.numberAnno} ${t.regionName} ${t.kato}`.toLowerCase();
        return full.includes(searchWords);
      }).slice(0, 3);

      const remainingNote = chatId === adminChatId ? "" : `\n<i>(Осталось поисков: ${searchLimit.remaining}/${MAX_SEARCHES_PER_HOUR} на этот час)</i>`;
      if (matches.length > 0) {
        await sendTelegramMessage(chatId, `🔍 <b>НАЙДЕНО ПО ЗАПРОСУ «${text.trim()}» (${matches.length}):</b>${remainingNote}\n━━━━━━━━━━━━━━━━━━━━`);
        for (const tender of matches) {
          const card = formatTenderTelegramCard(tender);
          await sendTelegramMessage(chatId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
        }
      } else {
        await sendTelegramMessage(chatId, `🔍 По запросу <b>«${text.trim()}»</b> активных объявлений не найдено.${remainingNote}\n\nПопробуйте изменить запрос или посмотреть /hot (горящие тендеры).`);
      }
      return { ok: true };
    }
  }

  // 2. Handling Inline Buttons callback queries
  if (update.callback_query?.data) {
    const query = update.callback_query;
    const data = query.data ?? "";
    const fromId = String(query.from.id);

    // Anti-Flood check for button clicks
    const flood = checkFloodSpam(fromId);
    if (flood.blocked) {
      await answerCallbackQuery(query.id, `🛑 Анти-спам: подождите ${flood.remainingSeconds} сек.`, true);
      return { ok: true };
    }

    // Approve user by admin
    if (data.startsWith("approve_user:")) {
      if (fromId !== adminChatId) {
        await answerCallbackQuery(query.id, "❌ Только Главный Администратор может одобрять заявки.", true);
        return { ok: true };
      }
      const [, targetUserId, targetChatId] = data.split(":");
      await updateTelegramSubscriberStatus(targetUserId, "approved", "admin");
      await answerCallbackQuery(query.id, "✅ Заявка одобрена!");

      // Edit admin's message buttons
      if (query.message) {
        await editMessageReplyMarkup(query.message.chat.id, query.message.message_id, {
          inline_keyboard: [[{ text: "✅ Доступ успешно одобрен", callback_data: "done" }]],
        });
      }

      // Notify the employee
      if (targetChatId) {
        await sendTelegramMessage(targetChatId, `🎉 <b>Главный Администратор одобрил ваш доступ!</b>\n\nТеперь вам будут поступать персональные подборки интересных тендеров и важные напоминания по дедлайнам.`);
      }
      return { ok: true };
    }

    // Reject user by admin
    if (data.startsWith("reject_user:")) {
      if (fromId !== adminChatId) {
        await answerCallbackQuery(query.id, "❌ Только Главный Администратор может отклонять заявки.", true);
        return { ok: true };
      }
      const [, targetUserId, targetChatId] = data.split(":");
      await updateTelegramSubscriberStatus(targetUserId, "rejected", "admin");
      await answerCallbackQuery(query.id, "❌ Заявка отклонена.");

      if (query.message) {
        await editMessageReplyMarkup(query.message.chat.id, query.message.message_id, {
          inline_keyboard: [[{ text: "❌ Доступ отклонен", callback_data: "done" }]],
        });
      }

      if (targetChatId) {
        await sendTelegramMessage(targetChatId, `⛔ <b>Ваша заявка на подключение уведомлений отклонена администратором.</b>`);
      }
      return { ok: true };
    }

    // Favorite tender button
    if (data.startsWith("fav:")) {
      const tenderId = data.slice(4);
      const sub = await getTelegramSubscriberByChatId(fromId);
      if (sub) {
        const ownerKey = `user:${sub.userId}`;
        const existingEntries = await listTenderWorkflow(ownerKey);
        const existing = existingEntries.find((e) => e.tenderId === tenderId);
        await saveTenderWorkflow(ownerKey, tenderId, true, existing?.stage ?? "none");
        await answerCallbackQuery(query.id, "★ Тендер добавлен в избранное!");
      } else {
        await answerCallbackQuery(query.id, "★ Добавлено в избранное");
      }
      return { ok: true };
    }

    // Hide tender button
    if (data.startsWith("hide:")) {
      const tenderId = data.slice(5);
      const sub = await getTelegramSubscriberByChatId(fromId);
      if (sub) {
        const ownerKey = `user:${sub.userId}`;
        const existingEntries = await listTenderWorkflow(ownerKey);
        const existing = existingEntries.find((e) => e.tenderId === tenderId);
        await saveTenderWorkflow(ownerKey, tenderId, existing?.isFavorite ?? false, "skipped");
        await answerCallbackQuery(query.id, "⛔ Тендер скрыт из вашей ленты.");
      } else {
        await answerCallbackQuery(query.id, "⛔ Тендер скрыт.");
      }
      return { ok: true };
    }

    // Hot tenders command button
    if (data === "cmd_hot") {
      await answerCallbackQuery(query.id, "Загружаем горящие тендеры...");
      const tenders = await listTenders(100);
      const now = Date.now();
      const hot = tenders
        .filter((t) => t.endDate && t.endDate > now)
        .sort((a, b) => (a.endDate ?? 0) - (b.endDate ?? 0))
        .slice(0, 3);

      if (hot.length === 0) {
        await sendTelegramMessage(fromId, "ℹ️ На данный момент нет срочных активных объявлений.");
      } else {
        await sendTelegramMessage(fromId, `🔥 <b>ТОП-3 ГОРЯЩИХ ТЕНДЕРА (СКОРО ДЕДЛАЙН):</b>\n━━━━━━━━━━━━━━━━━━━━`);
        for (const tender of hot) {
          const card = formatTenderTelegramCard(tender);
          await sendTelegramMessage(fromId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
        }
      }
      return { ok: true };
    }

    // Top budget command button
    if (data === "cmd_top") {
      await answerCallbackQuery(query.id, "Загружаем топ тендеров...");
      const tenders = await listTenders(100);
      const top = [...tenders].sort((a, b) => b.budget - a.budget).slice(0, 3);

      if (top.length === 0) {
        await sendTelegramMessage(fromId, "ℹ️ Тендеры ещё не загружены.");
      } else {
        await sendTelegramMessage(fromId, `💎 <b>ТОП-3 КРУПНЕЙШИХ ТЕНДЕРА ПО БЮДЖЕТУ:</b>\n━━━━━━━━━━━━━━━━━━━━`);
        for (const tender of top) {
          const card = formatTenderTelegramCard(tender);
          await sendTelegramMessage(fromId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
        }
      }
      return { ok: true };
    }

    // Digest command button
    if (data === "cmd_digest") {
      await answerCallbackQuery(query.id, "Формируем сводку...");
      const tenders = await listTenders(500);
      const now = Date.now();
      const active = tenders.filter((t) => !t.endDate || t.endDate > now);
      const hotCount = active.filter((t) => t.endDate && (t.endDate - now) <= 3 * 86400000).length;
      const totalBudget = active.reduce((acc, t) => acc + t.budget, 0);

      const msg = `📊 <b>СВОДКА ТЕНДЕРОВ НА СЕГОДНЯ</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 Всего активных объявлений: <b>${active.length}</b>\n` +
        `🔥 Срочных (дедлайн ≤ 3 дней): <b>${hotCount}</b>\n` +
        `💰 Общий объём закупок: <b>${moneyFormatter.format(totalBudget)}</b>\n\n` +
        `💡 <i>Нажмите кнопку ниже для просмотра:</i>`;

      await sendTelegramMessage(fromId, msg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔥 Горящие тендеры", callback_data: "cmd_hot" }, { text: "💎 Топ по бюджету", callback_data: "cmd_top" }],
          ],
        },
      });
      return { ok: true };
    }

    // My matched tenders button
    if (data === "cmd_my") {
      await answerCallbackQuery(query.id, "Подбираем тендеры...");
      const currentFilter = await getTelegramFilter(fromId);
      const tenders = await listTenders(500);
      const now = Date.now();
      const loc = localities.find((l) => l.value === currentFilter.locality);
      const cat = INDUSTRY_CATEGORIES.find((c) => c.id === currentFilter.category);

      const matched = tenders
        .filter((t) => !t.endDate || t.endDate > now)
        .filter((t) => {
          if (!loc || !loc.keywords || loc.keywords.length === 0) return true;
          const textToSearch = `${t.title} ${t.buyer} ${t.regionName} ${t.kato}`.toLowerCase();
          return loc.keywords.some((k) => textToSearch.includes(k));
        })
        .filter((t) => {
          if (!cat || !cat.keywords || cat.keywords.length === 0) return true;
          if (cat.id === "construction" && t.isConstructionWork) return true;
          const textToSearch = `${t.title} ${t.buyer} ${t.subjectType} ${t.methodName}`.toLowerCase();
          return cat.keywords.some((k) => textToSearch.includes(k));
        })
        .filter((t) => !currentFilter.maxBudget || t.budget <= currentFilter.maxBudget)
        .slice(0, 3);

      const locLabel = getLocalityLabel(currentFilter.locality);
      const catLabel = getCategoryLabel(currentFilter.category);

      if (matched.length === 0) {
        await sendTelegramMessage(fromId, `🎯 По вашему фильтру (<b>${locLabel}</b> | <b>${catLabel}</b>) сейчас нет активных объявлений.\n\nНажмите ⚙️ «Настроить фильтр», чтобы изменить отрасль, город или сумму.`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "⚙️ Настроить фильтр", callback_data: "open_filter_menu" }],
              [{ text: "🔥 Смотреть все горящие", callback_data: "cmd_hot" }],
            ],
          },
        });
      } else {
        await sendTelegramMessage(fromId, `🎯 <b>ВАШИ ПОДХОДЯЩИЕ ТЕНДЕРЫ\n(${locLabel} • ${catLabel}):</b>\n━━━━━━━━━━━━━━━━━━━━`);
        for (const tender of matched) {
          const card = formatTenderTelegramCard(tender);
          await sendTelegramMessage(fromId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
        }
      }
      return { ok: true };
    }

    // Open filter menu
    if (data === "open_filter_menu") {
      await answerCallbackQuery(query.id);
      await sendFilterSettingsMessage(fromId);
      return { ok: true };
    }

    // Choose locality menu
    if (data === "menu_locality") {
      await answerCallbackQuery(query.id);
      const localityButtons = [
        [{ text: "🎯 Туркестан и окрестные сёла", callback_data: "set_loc:turkestan_cluster" }],
        [{ text: "🏢 г. Туркестан (город)", callback_data: "set_loc:turkestan_city" }, { text: "⛏ г. Кентау", callback_data: "set_loc:kentau" }],
        [{ text: "🌾 Отырар / Шаулдер", callback_data: "set_loc:otyrar" }, { text: "🍇 Сарыагашский р-н", callback_data: "set_loc:saryagash" }],
        [{ text: "🏙 г. Шымкент", callback_data: "set_loc:shymkent" }, { text: "🏔 г. Алматы", callback_data: "set_loc:almaty" }],
        [{ text: "🏛 г. Астана", callback_data: "set_loc:astana" }, { text: "🌐 Весь Казахстан", callback_data: "set_loc:all" }],
        [{ text: "⬅️ Назад в настройки", callback_data: "open_filter_menu" }],
      ];
      await sendTelegramMessage(fromId, `📍 <b>ВЫБЕРИТЕ ВАШ ГОРОД ИЛИ РАЙОН:</b>\n━━━━━━━━━━━━━━━━━━━━\nБот будет показывать и присылать закупки только из выбранного населённого пункта.`, {
        reply_markup: { inline_keyboard: localityButtons },
      });
      return { ok: true };
    }

    // Set locality
    if (data.startsWith("set_loc:")) {
      const locVal = data.slice(8);
      await saveTelegramFilter({ chatId: fromId, locality: locVal });
      const label = getLocalityLabel(locVal);
      await answerCallbackQuery(query.id, `✅ Город изменён: ${label}`, true);
      await sendFilterSettingsMessage(fromId);
      return { ok: true };
    }

    // Choose category menu
    if (data === "menu_category") {
      await answerCallbackQuery(query.id);
      const categoryButtons = [
        [{ text: "🏗 Строительство и ремонт", callback_data: "set_cat:construction" }, { text: "📦 Товары и мебель", callback_data: "set_cat:goods" }],
        [{ text: "💻 IT и оргтехника", callback_data: "set_cat:it" }, { text: "🛡 Охрана и безопасность", callback_data: "set_cat:security" }],
        [{ text: "🧹 Клининг и уборка", callback_data: "set_cat:cleaning" }, { text: "🚚 Транспорт и ГСМ", callback_data: "set_cat:transport" }],
        [{ text: "🍲 Продукты и питание", callback_data: "set_cat:food" }, { text: "💊 Медицина и фарма", callback_data: "set_cat:medical" }],
        [{ text: "🌐 Все сферы (без ограничений)", callback_data: "set_cat:all" }],
        [{ text: "⬅️ Назад в настройки", callback_data: "open_filter_menu" }],
      ];
      await sendTelegramMessage(fromId, `📁 <b>ВЫБЕРИТЕ ВАШУ СФЕРУ ДЕЯТЕЛЬНОСТИ / НИШУ:</b>\n━━━━━━━━━━━━━━━━━━━━\nБот будет фильтровать тендеры строго по вашей специализации.`, {
        reply_markup: { inline_keyboard: categoryButtons },
      });
      return { ok: true };
    }

    // Set category
    if (data.startsWith("set_cat:")) {
      const catVal = data.slice(8) as IndustryCategory;
      await saveTelegramFilter({ chatId: fromId, category: catVal });
      const label = getCategoryLabel(catVal);
      await answerCallbackQuery(query.id, `✅ Сфера выбрана: ${label}`, true);
      await sendFilterSettingsMessage(fromId);
      return { ok: true };
    }

    // Menu budget
    if (data === "menu_budget") {
      await answerCallbackQuery(query.id);
      const budgetButtons = [
        [{ text: "Любой бюджет", callback_data: "set_budget:0" }],
        [{ text: "До 20 млн ₸", callback_data: "set_budget:20000000" }, { text: "До 50 млн ₸", callback_data: "set_budget:50000000" }],
        [{ text: "До 100 млн ₸", callback_data: "set_budget:100000000" }, { text: "До 500 млн ₸", callback_data: "set_budget:500000000" }],
        [{ text: "⬅️ Назад в настройки", callback_data: "open_filter_menu" }],
      ];
      await sendTelegramMessage(fromId, `💰 <b>ВЫБЕРИТЕ ОГРАНИЧЕНИЕ ПО БЮДЖЕТУ:</b>`, {
        reply_markup: { inline_keyboard: budgetButtons },
      });
      return { ok: true };
    }

    // Workflow Stage Menu
    if (data.startsWith("menu_stage:")) {
      const tenderId = data.slice(11);
      await answerCallbackQuery(query.id);
      const stageButtons = [
        [{ text: "⏳ Изучаем", callback_data: `set_stage:${tenderId}:studying` }, { text: "📝 Готовим заявку", callback_data: `set_stage:${tenderId}:preparing` }],
        [{ text: "🚀 Подали заявку", callback_data: `set_stage:${tenderId}:applied` }, { text: "🏆 Победили", callback_data: `set_stage:${tenderId}:won` }],
        [{ text: "❌ Проиграли", callback_data: `set_stage:${tenderId}:lost` }, { text: "🗑 Снять с контроля", callback_data: `set_stage:${tenderId}:none` }],
      ];
      await sendTelegramMessage(fromId, `📂 <b>ВЫБЕРИТЕ СТАДИЮ В РАБОТЕ (Тендер № ${tenderId}):</b>\n━━━━━━━━━━━━━━━━━━━━\nСтатус сразу синхронизируется с дашбордом компании.`, {
        reply_markup: { inline_keyboard: stageButtons },
      });
      return { ok: true };
    }

    // Set Workflow Stage
    if (data.startsWith("set_stage:")) {
      const [, tenderId, stage] = data.split(":");
      const sub = await getTelegramSubscriberByChatId(fromId);
      const ownerKey = sub ? `user:${sub.userId}` : `admin:${fromId}`;
      const isFav = stage !== "none";
      await saveTenderWorkflow(ownerKey, tenderId, isFav, stage as TenderStage);
      const stageName = STAGE_LABELS[stage] || "Снято с контроля";
      await answerCallbackQuery(query.id, `✅ Статус изменен: ${stageName}`, true);
      await sendTelegramMessage(fromId, `✅ <b>Статус тендера обновлен:</b> <code>${stageName}</code>\n\nВы можете просмотреть все закупки в работе через кнопку «📁 Мои в работе».`);
      return { ok: true };
    }

    // Interactive Checklists
    if (data.startsWith("tasks:")) {
      const tenderId = data.slice(6);
      await answerCallbackQuery(query.id, "Загрузка чек-листа...");
      const sub = await getTelegramSubscriberByChatId(fromId);
      const ownerKey = sub ? `user:${sub.userId}` : `admin:${fromId}`;
      let workspace = await getTenderTaskWorkspace(tenderId);
      if (workspace.tasks.length === 0) {
        await seedTenderTaskTemplate(tenderId, ownerKey);
        workspace = await getTenderTaskWorkspace(tenderId);
      }
      const tender = await getTenderById(tenderId);

      let taskMsg = `📑 <b>ЧЕК-ЛИСТ ДОКУМЕНТОВ РК</b>\n`;
      taskMsg += `📋 <b>Тендер № ${tender?.numberAnno || tenderId}</b> · ${tender?.methodName || "Госзакупки"}\n━━━━━━━━━━━━━━━━━━━━\n\n`;

      const taskButtons: Array<Array<{ text: string; callback_data: string }>> = [];
      workspace.tasks.forEach((t, i) => {
        const isDone = t.status === "done";
        taskMsg += `${i + 1}. ${isDone ? "✅" : "⬜"} <b>${t.title}</b>\n`;
        taskButtons.push([{
          text: `${isDone ? "✅ [Сделано]" : "⬜ [Отметить]"} ${t.title.slice(0, 30)}`,
          callback_data: `toggle_task:${t.id}:${tenderId}`,
        }]);
      });

      taskMsg += `\n💡 <i>Нажимайте кнопки ниже, чтобы отмечать выполненные шаги:</i>`;
      await sendTelegramMessage(fromId, taskMsg, { reply_markup: { inline_keyboard: taskButtons } });
      return { ok: true };
    }

    // Toggle Task status
    if (data.startsWith("toggle_task:")) {
      const [, taskId, tenderId] = data.split(":");
      const task = await getTenderTask(taskId);
      if (task) {
        const nextStatus = task.status === "done" ? "todo" : "done";
        await updateTenderTask(taskId, nextStatus, task.assignedUserId, task.dueAt);
        await answerCallbackQuery(query.id, nextStatus === "done" ? "✅ Шаг выполнен!" : "⬜ Шаг возвращен в работу");

        const workspace = await getTenderTaskWorkspace(tenderId);
        const tender = await getTenderById(tenderId);
        let taskMsg = `📑 <b>ЧЕК-ЛИСТ ДОКУМЕНТОВ РК</b>\n`;
        taskMsg += `📋 <b>Тендер № ${tender?.numberAnno || tenderId}</b> · ${tender?.methodName || "Госзакупки"}\n━━━━━━━━━━━━━━━━━━━━\n\n`;

        const taskButtons: Array<Array<{ text: string; callback_data: string }>> = [];
        workspace.tasks.forEach((t, i) => {
          const isDone = t.status === "done";
          taskMsg += `${i + 1}. ${isDone ? "✅" : "⬜"} <b>${t.title}</b>\n`;
          taskButtons.push([{
            text: `${isDone ? "✅ [Сделано]" : "⬜ [Отметить]"} ${t.title.slice(0, 30)}`,
            callback_data: `toggle_task:${t.id}:${tenderId}`,
          }]);
        });
        taskMsg += `\n💡 <i>Нажимайте кнопки ниже, чтобы отмечать выполненные шаги:</i>`;
        await sendTelegramMessage(fromId, taskMsg, { reply_markup: { inline_keyboard: taskButtons } });
      }
      return { ok: true };
    }

    // Lot Breakdown & Documents
    if (data.startsWith("lots:")) {
      const tenderId = data.slice(5);
      await answerCallbackQuery(query.id, "Загрузка лотов...");
      const tender = await getTenderById(tenderId);
      const details = await getTenderDetails(tenderId);

      let lotMsg = `📦 <b>ЛОТЫ И СПЕЦИФИКАЦИЯ</b>\n`;
      lotMsg += `📋 <b>№ ${tender?.numberAnno || tenderId}</b> · ${tender?.title}\n━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (details.lots && details.lots.length > 0) {
        details.lots.forEach((lot, i) => {
          lotMsg += `🔹 <b>Лот №${lot.lotNumber || i + 1}: ${lot.title}</b>\n`;
          lotMsg += `   Количество: <b>${lot.quantity}</b> | Сумма: <b>${moneyFormatter.format(lot.amount)}</b>\n`;
          if (lot.description) lotMsg += `   <i>${lot.description.slice(0, 100)}...</i>\n`;
          lotMsg += `\n`;
        });
      } else {
        lotMsg += `ℹ️ В данном объявлении 1 комплексный лот на сумму <b>${moneyFormatter.format(tender?.budget || 0)}</b>.\n`;
      }

      if (details.documents && details.documents.length > 0) {
        lotMsg += `\n📎 <b>Документация к закупке (${details.documents.length}):</b>\n`;
        details.documents.slice(0, 5).forEach((doc) => {
          lotMsg += `• <a href="${doc.url}">${doc.name || doc.originalName || "Скачать файл"}</a>\n`;
        });
      }

      await sendTelegramMessage(fromId, lotMsg);
      return { ok: true };
    }

    // Notes List
    if (data.startsWith("notes:")) {
      const tenderId = data.slice(6);
      await answerCallbackQuery(query.id);
      const tender = await getTenderById(tenderId);
      const notes = await listTenderNotes(tenderId);

      let noteMsg = `💬 <b>ЗАМЕТКИ ПО ТЕНДЕРУ № ${tender?.numberAnno || tenderId}</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
      if (notes.length === 0) {
        noteMsg += `Заметок пока нет.\n\n`;
      } else {
        notes.forEach((n) => {
          const date = dateFormatter.format(n.createdAt);
          noteMsg += `👤 <b>${n.authorName}</b> (${date}):\n<i>«${n.content}»</i>\n\n`;
        });
      }

      noteMsg += `💡 <i>Чтобы добавить новую заметку, отправьте сообщение:</i>\n<code>/note ${tenderId} Текст вашей заметки</code>`;
      await sendTelegramMessage(fromId, noteMsg);
      return { ok: true };
    }

    // Admin Delegation
    if (data.startsWith("delegate:")) {
      const tenderId = data.slice(9);
      if (fromId !== adminChatId) {
        await answerCallbackQuery(query.id, "❌ Только Главный Администратор может назначать тендеры.", true);
        return { ok: true };
      }
      await answerCallbackQuery(query.id);
      const subscribers = await listApprovedTelegramSubscribers();
      if (subscribers.length === 0) {
        await sendTelegramMessage(fromId, "ℹ️ Нет активных сотрудников с подключенным Telegram.");
        return { ok: true };
      }

      const employeeButtons = subscribers.map((s) => [{
        text: `👤 @${s.username || s.firstName || "Специалист"}`,
        callback_data: `assign:${tenderId}:${s.userId}`,
      }]);

      await sendTelegramMessage(fromId, `👤 <b>КОМУ ИЗ СОТРУДНИКОВ НАЗНАЧИТЬ ТЕНДЕР?</b>\n━━━━━━━━━━━━━━━━━━━━\nТендер будет отправлен специалисту в Telegram с пометкой поручения.`, {
        reply_markup: { inline_keyboard: employeeButtons },
      });
      return { ok: true };
    }

    // Assign to employee
    if (data.startsWith("assign:")) {
      const [, tenderId, targetUserId] = data.split(":");
      if (fromId !== adminChatId) {
        await answerCallbackQuery(query.id, "❌ Доступ запрещен.", true);
        return { ok: true };
      }
      const tender = await getTenderById(tenderId);
      const targetSub = await getTelegramSubscriberByUserId(targetUserId);

      if (tender && targetSub) {
        await saveTenderWorkflow(`user:${targetUserId}`, tenderId, true, "studying");
        const card = formatTenderTelegramCard(tender, null, "👑 ПОРУЧЕНИЕ ОТ РУКОВОДИТЕЛЯ: Тендер передан вам в работу.");
        await sendTelegramMessage(targetSub.chatId, card.text, { reply_markup: card.reply_markup });
        await answerCallbackQuery(query.id, "✅ Тендер успешно назначен сотруднику!", true);
        await sendTelegramMessage(fromId, `✅ <b>Тендер № ${tender.numberAnno} назначен сотруднику @${targetSub.username || targetSub.firstName}!</b>`);
      }
      return { ok: true };
    }

    // Set budget
    if (data.startsWith("set_budget:")) {
      const budgetNum = Number(data.slice(11)) || 0;
      await saveTelegramFilter({ chatId: fromId, maxBudget: budgetNum });
      await answerCallbackQuery(query.id, budgetNum > 0 ? `✅ Бюджет до ${moneyFormatter.format(budgetNum)}` : "✅ Бюджет: Любой");
      await sendFilterSettingsMessage(fromId);
      return { ok: true };
    }

    if (data === "done") {
      await answerCallbackQuery(query.id, "Действие уже выполнено.");
      return { ok: true };
    }
  }

  return { ok: true };
}

export async function sendAdminRecommendation(adminUsername: string, targetUserId: string, tender: TenderRecord, note: string) {
  const sub = await getTelegramSubscriberByUserId(targetUserId);
  if (!sub || sub.status !== "approved") {
    throw new Error("Сотрудник не подключил Telegram или его доступ не одобрен");
  }

  const profile = await getCompanyProfile(targetUserId);
  const card = formatTenderTelegramCard(tender, profile, `Рекомендация от @${adminUsername}: ${note}`);
  const res = await sendTelegramMessage(sub.chatId, card.text, { reply_markup: card.reply_markup });
  if (res.ok) {
    await recordTelegramDelivery(targetUserId, sub.chatId, tender.externalId, "manual_admin");
  }
  return res;
}

export async function checkAndSendInstantNewTenders(records: TenderRecord[]): Promise<{ delivered: number }> {
  const subscribers = await listApprovedTelegramSubscribers();
  const adminChatId = getAdminChatId();
  let delivered = 0;

  // Add admin if not in subscribers
  const targets = [...subscribers];
  if (adminChatId && !targets.some((s) => s.chatId === adminChatId)) {
    targets.push({
      id: "admin",
      userId: "admin",
      chatId: adminChatId,
      username: "admin",
      firstName: "Admin",
      status: "approved",
      requestedAt: Date.now(),
      approvedAt: Date.now(),
      approvedBy: "system",
      digestEnabled: true,
      instantEnabled: true,
      deadlinesEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  for (const sub of targets) {
    if (!sub.instantEnabled) continue;
    const filter = await getTelegramFilter(sub.chatId);
    const loc = localities.find((l) => l.value === filter.locality);
    const cat = INDUSTRY_CATEGORIES.find((c) => c.id === filter.category);

    for (const tender of records.slice(0, 50)) {
      // Check location match
      if (loc && loc.keywords && loc.keywords.length > 0) {
        const textToSearch = `${tender.title} ${tender.buyer} ${tender.regionName} ${tender.kato}`.toLowerCase();
        const matchesLoc = loc.keywords.some((k) => textToSearch.includes(k));
        if (!matchesLoc) continue;
      }

      // Check category match
      if (cat && cat.keywords && cat.keywords.length > 0) {
        if (!(cat.id === "construction" && tender.isConstructionWork)) {
          const textToSearch = `${tender.title} ${tender.buyer} ${tender.subjectType} ${tender.methodName}`.toLowerCase();
          const matchesCat = cat.keywords.some((k) => textToSearch.includes(k));
          if (!matchesCat) continue;
        }
      }

      // Check budget
      if (filter.maxBudget > 0 && tender.budget > filter.maxBudget) continue;

      // Check delivery record
      const alreadySent = await isTenderDeliveredToUser(sub.userId, tender.externalId, "instant_new");
      if (alreadySent) continue;

      const card = formatTenderTelegramCard(tender, null, undefined, sub.chatId === adminChatId);
      const alertText = `🚨 <b>НОВЫЙ ПОДХОДЯЩИЙ ТЕНДЕР В ВАШЕМ РЕГИОНЕ!</b>\n━━━━━━━━━━━━━━━━━━━━\n` + card.text;

      const res = await sendTelegramMessage(sub.chatId, alertText, { reply_markup: { inline_keyboard: card.buttons } });
      if (res.ok) {
        await recordTelegramDelivery(sub.userId, sub.chatId, tender.externalId, "instant_new");
        delivered++;
      }
    }
  }

  return { delivered };
}

export async function checkAndSendDeadlineAlerts(): Promise<{ delivered: number }> {
  const subscribers = await listApprovedTelegramSubscribers();
  let delivered = 0;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const tenders = await listTenders(500);

  for (const sub of subscribers) {
    const ownerKey = `user:${sub.userId}`;
    const workflow = await listTenderWorkflow(ownerKey);

    const relevantTenders = workflow.filter((w) => w.isFavorite || w.stage === "participating" || w.stage === "reviewing");

    for (const item of relevantTenders) {
      const tender = tenders.find((t) => t.externalId === item.tenderId);
      if (!tender || !tender.endDate) continue;

      const timeLeft = tender.endDate - now;
      if (timeLeft > 0 && timeLeft <= dayMs) {
        const alreadySent = await isTenderDeliveredToUser(sub.userId, tender.externalId, "deadline_24h");
        if (!alreadySent) {
          const hoursLeft = Math.max(1, Math.round(timeLeft / (60 * 60 * 1000)));
          const alertText = `⏰ <b>СРОЧНОЕ НАПОМИНАНИЕ О ДЕДЛАЙНЕ!</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
            `Заканчивается приём заявок (осталось <b>~${hoursLeft} ч.</b>):\n\n` +
            `📋 <b>№ ${tender.numberAnno}</b> · ${tender.methodName}\n` +
            `📌 <b>${tender.title}</b>\n` +
            `💰 <b>Бюджет:</b> ${moneyFormatter.format(tender.budget)}\n` +
            `🏢 <b>Заказчик:</b> ${tender.buyer}\n` +
            `📍 <b>Регион:</b> ${tender.regionName}\n` +
            `⏳ <b>Срок:</b> ${dateFormatter.format(tender.endDate)}\n\n` +
            `⚠️ <i>Проверьте прикрепление файлов, платёжного поручения обеспечения и подпишите заявку ЭЦП вовремя!</i>`;

          const buttons = [
            [{ text: "🌐 Открыть на Goszakup", url: tender.sourceUrl }],
          ];

          const res = await sendTelegramMessage(sub.chatId, alertText, { reply_markup: { inline_keyboard: buttons } });
          if (res.ok) {
            await recordTelegramDelivery(sub.userId, sub.chatId, tender.externalId, "deadline_24h");
            delivered++;
          }
        }
      }
    }
  }

  return { delivered };
}
